# =============================================================================
# R Package Dataset Export Script for Dataextractor Validation
# =============================================================================
#
# This script exports meta-analysis datasets from R packages to JSON format
# for validation against the Dataextractor tool.
#
# Packages included:
#   - metadat: 93 datasets (comprehensive meta-analysis collection)
#   - netmeta: 9 datasets (network meta-analysis)
#   - meta: 7 datasets (standard meta-analysis)
#   - mada: 6 datasets (diagnostic accuracy)
#
# Usage:
#   source("export_r_datasets.R")
#
# Output:
#   JSON files in the 'datasets/' subfolder
#
# =============================================================================

cat("=============================================================================\n")
cat("R Package Dataset Export Script\n")
cat("=============================================================================\n\n")

# -----------------------------------------------------------------------------
# Install required packages
# -----------------------------------------------------------------------------

install_if_missing <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat(sprintf("Installing package: %s\n", pkg))
    install.packages(pkg, repos = "https://cloud.r-project.org")
  } else {
    cat(sprintf("Package already installed: %s\n", pkg))
  }
}

cat("Checking and installing required packages...\n\n")

install_if_missing("metadat")
install_if_missing("netmeta")
install_if_missing("meta")
install_if_missing("mada")
install_if_missing("jsonlite")

cat("\nLoading libraries...\n")
suppressPackageStartupMessages({
  library(metadat)
  library(netmeta)
  library(meta)
  library(mada)
  library(jsonlite)
})

cat("Libraries loaded successfully.\n\n")

# -----------------------------------------------------------------------------
# Create output directory
# -----------------------------------------------------------------------------

output_dir <- "datasets"
if (!dir.exists(output_dir)) {
  dir.create(output_dir)
  cat(sprintf("Created output directory: %s\n\n", output_dir))
} else {
  cat(sprintf("Output directory exists: %s\n\n", output_dir))
}

# -----------------------------------------------------------------------------
# Export function
# -----------------------------------------------------------------------------

export_dataset <- function(dataset_name, package_name, verbose = TRUE) {
  tryCatch({
    # Load the dataset
    data(list = dataset_name, package = package_name, envir = environment())
    df <- get(dataset_name, envir = environment())

    # Get dimensions
    n_rows <- nrow(df)
    n_cols <- ncol(df)

    # Convert to JSON and save
    json_path <- file.path(output_dir, paste0(dataset_name, ".json"))
    write_json(df, json_path, pretty = TRUE, auto_unbox = TRUE, na = "null")

    if (verbose) {
      cat(sprintf("  [OK] %s: %d rows x %d cols\n", dataset_name, n_rows, n_cols))
    }

    return(list(
      success = TRUE,
      dataset = dataset_name,
      package = package_name,
      rows = n_rows,
      cols = n_cols,
      columns = colnames(df)
    ))
  }, error = function(e) {
    if (verbose) {
      cat(sprintf("  [FAIL] %s: %s\n", dataset_name, e$message))
    }
    return(list(
      success = FALSE,
      dataset = dataset_name,
      package = package_name,
      error = e$message
    ))
  })
}

# -----------------------------------------------------------------------------
# Key datasets to export (prioritized)
# -----------------------------------------------------------------------------

key_datasets <- list(
  # Binary outcome datasets
  list(name = "dat.bcg", package = "metadat",
       description = "BCG Vaccine - 13 studies, binary outcomes"),
  list(name = "dat.baker2009", package = "metadat",
       description = "COPD Treatments - 39 studies, NMA"),
  list(name = "dat.hasselblad1998", package = "metadat",
       description = "Smoking Cessation - 24 studies, NMA"),
  list(name = "dat.yusuf1985", package = "metadat",
       description = "Beta Blockers - 21 studies"),
  list(name = "dat.dogliotti2014", package = "metadat",
       description = "Antithrombotic - 20 studies, NMA"),
  list(name = "dat.linde2005", package = "metadat",
       description = "St. John's Wort - 26 studies"),
  list(name = "dat.colditz1994", package = "metadat",
       description = "BCG Vaccine alias - 13 studies"),

  # Continuous outcome datasets
  list(name = "dat.normand1999", package = "metadat",
       description = "Stroke Hospital Stay - 9 studies, continuous"),
  list(name = "dat.raudenbush1985", package = "metadat",
       description = "Teacher Expectations - 19 studies"),
  list(name = "dat.senn2013", package = "metadat",
       description = "Glucose-Lowering - 26 studies, NMA"),
  list(name = "dat.konstantopoulos2011", package = "metadat",
       description = "School Calendars - 56 effect sizes"),
  list(name = "dat.berkey1998", package = "metadat",
       description = "Periodontal Disease - 5 studies, multivariate"),

  # Network meta-analysis datasets
  list(name = "dat.linde2016", package = "metadat",
       description = "Antidepressants - 93 studies, 22 treatments"),

  # Survival outcome datasets
  list(name = "dat.riley2003", package = "metadat",
       description = "Neuroblastoma - 81 studies, survival"),
  list(name = "dat.pignon2000", package = "metadat",
       description = "Head/Neck Cancer - 65 trials, survival"),

  # Diagnostic accuracy datasets
  list(name = "dat.kearon1998", package = "metadat",
       description = "Venous Ultrasonography - 30 DTA studies"),
  list(name = "AuditC", package = "mada",
       description = "Alcohol Screening - DTA"),
  list(name = "Dementia", package = "mada",
       description = "Dementia Screening - DTA"),

  # netmeta datasets
  list(name = "Baker2009", package = "netmeta",
       description = "COPD NMA from netmeta"),
  list(name = "Dogliotti2014", package = "netmeta",
       description = "Antithrombotic NMA from netmeta"),
  list(name = "smokingcessation", package = "netmeta",
       description = "Smoking Cessation NMA"),
  list(name = "Linde2016", package = "netmeta",
       description = "Depression NMA from netmeta"),

  # meta datasets
  list(name = "Fleiss1993bin", package = "meta",
       description = "Aspirin after MI - binary"),
  list(name = "Olkin1995", package = "meta",
       description = "Thrombolytic Therapy")
)

# -----------------------------------------------------------------------------
# Export key datasets first
# -----------------------------------------------------------------------------

cat("=== Exporting Key Datasets (Priority) ===\n\n")

key_results <- list()
for (ds in key_datasets) {
  result <- export_dataset(ds$name, ds$package)
  key_results[[ds$name]] <- result
}

cat(sprintf("\nKey datasets exported: %d\n",
            sum(sapply(key_results, function(x) x$success))))

# -----------------------------------------------------------------------------
# Export all metadat datasets
# -----------------------------------------------------------------------------

cat("\n=== Exporting All metadat Datasets ===\n\n")

metadat_datasets <- c(
  "dat.aloe2013", "dat.anand1999", "dat.assink2016", "dat.axfors2021",
  "dat.bakdash2021", "dat.baker2009", "dat.bangertdrowns2004", "dat.bartos2023",
  "dat.baskerville2012", "dat.bcg", "dat.begg1989", "dat.berkey1998",
  "dat.besson2016", "dat.bonett2010", "dat.bornmann2007", "dat.bourassa1996",
  "dat.cannon2006", "dat.cohen1981", "dat.colditz1994", "dat.collins1985a",
  "dat.collins1985b", "dat.craft2003", "dat.crede2010", "dat.crisafulli2020",
  "dat.curtis1998", "dat.dagostino1998", "dat.damico2009", "dat.debruin2009",
  "dat.demir2022", "dat.dogliotti2014", "dat.dong2013", "dat.dorn2007",
  "dat.egger2001", "dat.fine1993", "dat.franchini2012", "dat.frank2008",
  "dat.furukawa2003", "dat.gibson2002", "dat.graves2010", "dat.gurusamy2011",
  "dat.hackshaw1998", "dat.hahn2001", "dat.hannum2020", "dat.hart1999",
  "dat.hartmannboyce2018", "dat.hasselblad1998", "dat.hine1989", "dat.ishak2007",
  "dat.kalaian1996", "dat.kearon1998", "dat.knapp2017", "dat.konstantopoulos2011",
  "dat.landenberger2005", "dat.laopaiboon2015", "dat.lau1992", "dat.lee2004",
  "dat.lehmann2018", "dat.li2007", "dat.lim2014", "dat.linde2005",
  "dat.linde2015", "dat.linde2016", "dat.lopez2019", "dat.maire2019",
  "dat.mccurdy2020", "dat.mcdaniel1994", "dat.michael2013", "dat.molloy2014",
  "dat.moura2021", "dat.nakagawa2007", "dat.nielweise2007", "dat.nielweise2008",
  "dat.normand1999", "dat.obrien2003", "dat.pagliaro1992", "dat.pignon2000",
  "dat.pritz1997", "dat.raudenbush1985", "dat.riley2003", "dat.roever2022",
  "dat.senn2013", "dat.spooner2002", "dat.stowe2010", "dat.tannersmith2016",
  "dat.ursino2021", "dat.vanhowe1999", "dat.viechtbauer2021", "dat.white2020",
  "dat.woods2010", "dat.yusuf1985"
)

metadat_results <- list()
metadat_success <- 0
metadat_fail <- 0

for (ds_name in metadat_datasets) {
  result <- export_dataset(ds_name, "metadat")
  metadat_results[[ds_name]] <- result
  if (result$success) metadat_success <- metadat_success + 1
  else metadat_fail <- metadat_fail + 1
}

cat(sprintf("\nmetadat: %d/%d exported successfully\n",
            metadat_success, length(metadat_datasets)))

# -----------------------------------------------------------------------------
# Export all netmeta datasets
# -----------------------------------------------------------------------------

cat("\n=== Exporting All netmeta Datasets ===\n\n")

netmeta_datasets <- c(
  "Baker2009", "dietaryfat", "Dogliotti2014", "Dong2013",
  "Franchini2012", "Gurusamy2011", "Linde2015", "Linde2016", "smokingcessation"
)

netmeta_results <- list()
netmeta_success <- 0
netmeta_fail <- 0

for (ds_name in netmeta_datasets) {
  result <- export_dataset(ds_name, "netmeta")
  netmeta_results[[ds_name]] <- result
  if (result$success) netmeta_success <- netmeta_success + 1
  else netmeta_fail <- netmeta_fail + 1
}

cat(sprintf("\nnetmeta: %d/%d exported successfully\n",
            netmeta_success, length(netmeta_datasets)))

# -----------------------------------------------------------------------------
# Export all meta datasets
# -----------------------------------------------------------------------------

cat("\n=== Exporting All meta Datasets ===\n\n")

meta_datasets <- c(
  "amlodipine", "caffeine", "cisapride", "Fleiss1993bin",
  "Fleiss1993cont", "Olkin1995", "Pagliaro1992"
)

meta_results <- list()
meta_success <- 0
meta_fail <- 0

for (ds_name in meta_datasets) {
  result <- export_dataset(ds_name, "meta")
  meta_results[[ds_name]] <- result
  if (result$success) meta_success <- meta_success + 1
  else meta_fail <- meta_fail + 1
}

cat(sprintf("\nmeta: %d/%d exported successfully\n",
            meta_success, length(meta_datasets)))

# -----------------------------------------------------------------------------
# Export all mada datasets
# -----------------------------------------------------------------------------

cat("\n=== Exporting All mada Datasets ===\n\n")

mada_datasets <- c("AuditC", "Dementia", "IAQ", "SAQ", "skin_tests", "smoking")

mada_results <- list()
mada_success <- 0
mada_fail <- 0

for (ds_name in mada_datasets) {
  result <- export_dataset(ds_name, "mada")
  mada_results[[ds_name]] <- result
  if (result$success) mada_success <- mada_success + 1
  else mada_fail <- mada_fail + 1
}

cat(sprintf("\nmada: %d/%d exported successfully\n",
            mada_success, length(mada_datasets)))

# -----------------------------------------------------------------------------
# Generate export summary
# -----------------------------------------------------------------------------

cat("\n=============================================================================\n")
cat("EXPORT SUMMARY\n")
cat("=============================================================================\n\n")

total_success <- metadat_success + netmeta_success + meta_success + mada_success
total_attempted <- length(metadat_datasets) + length(netmeta_datasets) +
                   length(meta_datasets) + length(mada_datasets)

cat(sprintf("Total datasets exported: %d / %d\n", total_success, total_attempted))
cat(sprintf("  - metadat: %d / %d\n", metadat_success, length(metadat_datasets)))
cat(sprintf("  - netmeta: %d / %d\n", netmeta_success, length(netmeta_datasets)))
cat(sprintf("  - meta:    %d / %d\n", meta_success, length(meta_datasets)))
cat(sprintf("  - mada:    %d / %d\n", mada_success, length(mada_datasets)))
cat(sprintf("\nOutput directory: %s\n", normalizePath(output_dir)))

# -----------------------------------------------------------------------------
# Create manifest file
# -----------------------------------------------------------------------------

manifest <- list(
  export_timestamp = Sys.time(),
  r_version = R.version.string,
  packages = list(
    metadat = as.character(packageVersion("metadat")),
    netmeta = as.character(packageVersion("netmeta")),
    meta = as.character(packageVersion("meta")),
    mada = as.character(packageVersion("mada"))
  ),
  total_exported = total_success,
  datasets = list(
    metadat = Filter(function(x) x$success, metadat_results),
    netmeta = Filter(function(x) x$success, netmeta_results),
    meta = Filter(function(x) x$success, meta_results),
    mada = Filter(function(x) x$success, mada_results)
  )
)

manifest_path <- file.path(output_dir, "_manifest.json")
write_json(manifest, manifest_path, pretty = TRUE, auto_unbox = TRUE)
cat(sprintf("\nManifest saved: %s\n", manifest_path))

# -----------------------------------------------------------------------------
# Export detailed info for key validation datasets
# -----------------------------------------------------------------------------

cat("\n=============================================================================\n")
cat("KEY DATASET DETAILS FOR VALIDATION\n")
cat("=============================================================================\n\n")

# dat.bcg details
cat("--- dat.bcg (BCG Vaccine Against Tuberculosis) ---\n")
data(dat.bcg, package = "metadat")
cat(sprintf("  Rows: %d\n", nrow(dat.bcg)))
cat(sprintf("  Columns: %s\n", paste(colnames(dat.bcg), collapse = ", ")))
cat(sprintf("  Total tpos: %d\n", sum(dat.bcg$tpos)))
cat(sprintf("  Total tneg: %d\n", sum(dat.bcg$tneg)))
cat(sprintf("  Total cpos: %d\n", sum(dat.bcg$cpos)))
cat(sprintf("  Total cneg: %d\n", sum(dat.bcg$cneg)))
cat("  First study:", paste(dat.bcg$author[1], dat.bcg$year[1]), "\n")
cat("  Last study:", paste(dat.bcg$author[13], dat.bcg$year[13]), "\n\n")

# dat.normand1999 details
cat("--- dat.normand1999 (Hospital Stay - Continuous) ---\n")
data(dat.normand1999, package = "metadat")
cat(sprintf("  Rows: %d\n", nrow(dat.normand1999)))
cat(sprintf("  Columns: %s\n", paste(colnames(dat.normand1999), collapse = ", ")))
cat(sprintf("  Total n1i: %d\n", sum(dat.normand1999$n1i)))
cat(sprintf("  Total n2i: %d\n", sum(dat.normand1999$n2i)))
cat(sprintf("  Total participants: %d\n", sum(dat.normand1999$n1i) + sum(dat.normand1999$n2i)))
cat("\n")

# dat.hasselblad1998 details
cat("--- dat.hasselblad1998 (Smoking Cessation NMA) ---\n")
data(dat.hasselblad1998, package = "metadat")
cat(sprintf("  Rows: %d\n", nrow(dat.hasselblad1998)))
cat(sprintf("  Columns: %s\n", paste(colnames(dat.hasselblad1998), collapse = ", ")))
cat(sprintf("  Unique studies: %d\n", length(unique(dat.hasselblad1998$study))))
cat(sprintf("  Unique treatments: %d\n", length(unique(dat.hasselblad1998$trt))))
cat(sprintf("  Treatments: %s\n", paste(unique(dat.hasselblad1998$trt), collapse = ", ")))
cat("\n")

# dat.linde2016 details
cat("--- dat.linde2016 (Antidepressants NMA) ---\n")
data(dat.linde2016, package = "metadat")
cat(sprintf("  Rows: %d\n", nrow(dat.linde2016)))
cat(sprintf("  Columns: %s\n", paste(colnames(dat.linde2016), collapse = ", ")))
all_treatments <- unique(c(dat.linde2016$treat1, dat.linde2016$treat2))
cat(sprintf("  Unique treatments: %d\n", length(all_treatments)))
cat("\n")

# dat.baker2009 details
cat("--- dat.baker2009 (COPD NMA) ---\n")
data(dat.baker2009, package = "metadat")
cat(sprintf("  Rows: %d\n", nrow(dat.baker2009)))
cat(sprintf("  Columns: %s\n", paste(colnames(dat.baker2009), collapse = ", ")))
cat(sprintf("  Unique studies: %d\n", length(unique(dat.baker2009$study))))
cat(sprintf("  Unique treatments: %d\n", length(unique(dat.baker2009$treatment))))
cat(sprintf("  Treatments: %s\n", paste(unique(dat.baker2009$treatment), collapse = ", ")))
cat(sprintf("  Total participants: %d\n", sum(dat.baker2009$total)))
cat("\n")

cat("=============================================================================\n")
cat("EXPORT COMPLETE\n")
cat("=============================================================================\n\n")

cat("Next steps:\n")
cat("1. Run validation: node validate_r_datasets.js --report\n")
cat("2. View report: validation_report.html\n")
cat("\n")
