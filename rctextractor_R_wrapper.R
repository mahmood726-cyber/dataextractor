#' RCTExtractor R Wrapper
#'
#' This package provides R bindings for RCTExtractor v4.8 AI,
#' enabling automated RCT data extraction within R workflows.
#'
#' @author RCTExtractor Team
#' @description Automated AI-powered RCT data extraction for meta-analysis
#'
#' Unlike manual data extraction, RCTExtractor:
#' - Automatically extracts HR, RR, OR, NNT from text
#' - Identifies study characteristics, sample sizes, baseline data
#' - Classifies cardiovascular domain (HF, AF, ACS, Valvular, Lipid)
#' - Assesses extraction quality and bias risk
#' - Works in seconds, not hours
#'
#' @examples
#' # Extract data from a PDF
#' result <- extract_rct("path/to/paper.pdf")
#'
#' # Get meta-analysis ready data
#' meta_data <- rct_to_metafor(result)
#'
#' # Run meta-analysis with metafor
#' library(metafor)
#' rma(yi, sei, data = meta_data, method = "REML")

# Check for V8 engine
.onLoad <- function(libname, pkgname) {
  if (!requireNamespace("V8", quietly = TRUE)) {
    message("RCTExtractor requires the V8 package. Installing...")
    install.packages("V8")
  }
}

#' Extract RCT data from text or PDF
#'
#' @param input Character string (text) or file path (PDF/TXT)
#' @param domain Optional domain hint: "HF", "AF", "ACS", "VALVULAR", "LIPID"
#' @return List containing extracted RCT data
#' @export
extract_rct <- function(input, domain = NULL) {
  # Load V8
  library(V8)

  # Get text content
  if (file.exists(input)) {
    if (grepl("\\.pdf$", input, ignore.case = TRUE)) {
      if (!requireNamespace("pdftools", quietly = TRUE)) {
        stop("pdftools package required for PDF extraction. Install with: install.packages('pdftools')")
      }
      text <- paste(pdftools::pdf_text(input), collapse = "\n")
    } else {
      text <- paste(readLines(input, warn = FALSE), collapse = "\n")
    }
  } else {
    text <- input
  }

  # Initialize V8 context with RCTExtractor
  ctx <- v8()

  # Load the embedded JS (minified version)
  js_path <- system.file("js", "RCTExtractor_v4_8_AI.min.js", package = "rctextractor")
  if (js_path == "") {
    # Development mode - use local file
    js_path <- "RCTExtractor_v4_8_AI.js"
  }

  if (file.exists(js_path)) {
    ctx$source(js_path)
  } else {
    stop("RCTExtractor JS module not found")
  }

  # Run extraction
  ctx$assign("inputText", text)
  result_json <- ctx$eval("JSON.stringify(RCTExtractor.extract(inputText))")

  # Parse and return
  result <- jsonlite::fromJSON(result_json)
  class(result) <- c("rct_extraction", class(result))

  return(result)
}

#' Get summary of RCT extraction
#'
#' @param result Result from extract_rct()
#' @return Data frame with summary statistics
#' @export
rct_summary <- function(result) {
  if (!inherits(result, "rct_extraction")) {
    stop("Input must be result from extract_rct()")
  }

  data.frame(
    acronym = result$study$acronym %||% NA,
    domain = result$`_meta`$domain %||% NA,
    domain_confidence = result$`_meta`$domainConfidence %||% NA,
    total_n = result$population$total %||% NA,
    treatment_n = result$treatment$n %||% NA,
    control_n = result$control$n %||% NA,
    mean_age = result$baseline$age$mean %||% NA,
    hr = result$contrast$effect %||% NA,
    ci_lo = result$contrast$ciLo %||% NA,
    ci_hi = result$contrast$ciHi %||% NA,
    p_value = result$contrast$pValue %||% NA,
    quality_grade = result$`_meta`$qualityScore$grade %||% NA,
    quality_score = result$`_meta`$qualityScore$overall %||% NA,
    bias_risk = result$`_meta`$biasAssessment$overallRisk %||% NA,
    stringsAsFactors = FALSE
  )
}

#' Convert RCT extraction to metafor-compatible format
#'
#' @param result Result from extract_rct()
#' @param measure Effect measure: "HR", "RR", "OR"
#' @return Data frame ready for metafor::rma()
#' @export
rct_to_metafor <- function(result, measure = "HR") {
  if (!inherits(result, "rct_extraction")) {
    stop("Input must be result from extract_rct()")
  }

  hr <- result$contrast$effect
  ci_lo <- result$contrast$ciLo
  ci_hi <- result$contrast$ciHi

  if (is.null(hr) || is.null(ci_lo) || is.null(ci_hi)) {
    warning("Missing effect size or CI - returning partial data")
    yi <- if (!is.null(hr)) log(hr) else NA
    sei <- NA
  } else {
    # Log-transform for meta-analysis
    yi <- log(hr)
    # Calculate SE from CI (assuming 95% CI, z = 1.96)
    sei <- (log(ci_hi) - log(ci_lo)) / 3.92
  }

  data.frame(
    study = result$study$acronym %||% "Unknown",
    yi = yi,
    sei = sei,
    vi = sei^2,
    ni = result$population$total %||% NA,
    measure = measure,
    stringsAsFactors = FALSE
  )
}

#' Batch extract from multiple files
#'
#' @param files Vector of file paths (PDF or TXT)
#' @param parallel Use parallel processing (default: TRUE if >5 files)
#' @return List of extraction results
#' @export
batch_extract <- function(files, parallel = NULL) {
  if (is.null(parallel)) {
    parallel <- length(files) > 5
  }

  if (parallel && requireNamespace("future.apply", quietly = TRUE)) {
    future.apply::future_lapply(files, extract_rct)
  } else {
    lapply(files, extract_rct)
  }
}

#' Combine multiple extractions into meta-analysis dataset
#'
#' @param results List of results from extract_rct() or batch_extract()
#' @return Data frame ready for meta-analysis
#' @export
combine_for_meta <- function(results) {
  if (!is.list(results)) {
    stop("Input must be a list of extraction results")
  }

  dfs <- lapply(results, function(r) {
    tryCatch(rct_to_metafor(r), error = function(e) NULL)
  })

  dfs <- Filter(Negate(is.null), dfs)

  if (length(dfs) == 0) {
    stop("No valid extractions to combine")
  }

  do.call(rbind, dfs)
}

#' Print method for RCT extraction
#' @export
print.rct_extraction <- function(x, ...) {
  cat("RCT Extraction Result\n")
  cat("=====================\n")
  cat("Study:", x$study$acronym %||% "Unknown", "\n")
  cat("Domain:", x$`_meta`$domain %||% "Unknown",
      sprintf("(%.0f%% confidence)\n", (x$`_meta`$domainConfidence %||% 0) * 100))
  cat("Sample Size:", x$population$total %||% "N/A", "\n")
  cat("Primary HR:",
      if (!is.null(x$contrast$effect)) sprintf("%.2f", x$contrast$effect) else "N/A",
      if (!is.null(x$contrast$ciLo) && !is.null(x$contrast$ciHi))
        sprintf("(95%% CI: %.2f-%.2f)", x$contrast$ciLo, x$contrast$ciHi) else "",
      "\n")
  cat("Quality Grade:", x$`_meta`$qualityScore$grade %||% "N/A", "\n")
  cat("Bias Risk:", x$`_meta`$biasAssessment$overallRisk %||% "N/A", "\n")
  cat("\nDrugs found:", length(x$aiEntities$drugs), "\n")
  cat("Effect measures:",
      length(x$effectMeasures$hazardRatios) +
      length(x$effectMeasures$relativeRisks) +
      length(x$effectMeasures$oddsRatios), "\n")
  invisible(x)
}

# Helper for NULL coalescing
`%||%` <- function(a, b) if (is.null(a)) b else a


# =============================================================================
# USAGE EXAMPLE
# =============================================================================
#' @examples
#' \dontrun{
#' # Single paper extraction
#' result <- extract_rct("dapa_hf_paper.pdf")
#' print(result)
#'
#' # Get metafor-ready data
#' meta_data <- rct_to_metafor(result)
#'
#' # Batch extraction from multiple papers
#' files <- list.files("papers/", pattern = "\\.pdf$", full.names = TRUE)
#' results <- batch_extract(files)
#'
#' # Combine for meta-analysis
#' combined <- combine_for_meta(results)
#'
#' # Run meta-analysis with metafor
#' library(metafor)
#' ma <- rma(yi, sei = sei, data = combined, method = "REML")
#' forest(ma)
#' funnel(ma)
#' }
