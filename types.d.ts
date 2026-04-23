/**
 * Type definitions for rctextractor
 * AI-Enhanced RCT Data Extraction Engine
 *
 * @version 4.9.7
 * @author RCTExtractor Team
 * @license MIT
 */

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all properties of T required recursively
 */
export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract keys of T where the value type is V
 */
export type KeysOfType<T, V> = {
    [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Risk level type used throughout assessments
 */
export type RiskLevel = 'low' | 'some_concerns' | 'high';

/**
 * Severity level for GRADE domains
 */
export type SeverityLevel = 'no' | 'serious' | 'very_serious';

/**
 * GRADE certainty levels
 */
export type CertaintyLevel = 'high' | 'moderate' | 'low' | 'very_low';

/**
 * Effect measure type identifiers
 */
export type EffectMeasureType = 'HR' | 'RR' | 'OR' | 'RD' | 'MD' | 'RateRatio' | 'NNT' | 'NNH' | 'IRR' | 'SMD';

/**
 * Quality grade type
 */
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Log level type
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

/**
 * Issue severity
 */
export type IssueSeverity = 'error' | 'warning' | 'info';

/**
 * Domain types supported by the extractor
 */
export type TherapeuticDomain =
    | 'HF'       // Heart Failure
    | 'AF'       // Atrial Fibrillation
    | 'DM'       // Diabetes Mellitus
    | 'ONCOLOGY' // Oncology
    | 'CARDIO'   // Cardiology (general)
    | 'NEURO'    // Neurology
    | 'RESP'     // Respiratory
    | 'RENAL'    // Renal/Nephrology
    | 'RHEUM'    // Rheumatology
    | 'COVID'    // COVID-19
    | 'OTHER';   // Other/Unknown

// ============================================================
// ERROR TYPES
// ============================================================

/**
 * Custom error class for extraction failures
 */
export class RCTExtractorError extends Error {
    /** Error code for programmatic handling */
    code: ErrorCode;
    /** The field that caused the error, if applicable */
    field?: string;
    /** The original input that caused the error */
    input?: string;
    /** Suggested fix or next steps */
    suggestion?: string;
    /** Stack trace */
    stack?: string;

    constructor(message: string, code: ErrorCode, field?: string);
}

/**
 * Error codes used by RCTExtractorError
 */
export enum ErrorCode {
    INVALID_INPUT = 'INVALID_INPUT',
    EXTRACTION_FAILED = 'EXTRACTION_FAILED',
    PDF_PARSE_ERROR = 'PDF_PARSE_ERROR',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    TIMEOUT = 'TIMEOUT',
    NETWORK_ERROR = 'NETWORK_ERROR',
    RATE_LIMITED = 'RATE_LIMITED',
    UNKNOWN = 'UNKNOWN'
}

// ============================================================
// CORE DATA TYPES
// ============================================================

/**
 * Effect measure with confidence interval
 */
export interface EffectMeasure {
    /** Type of effect measure */
    type: EffectMeasureType;
    /** Point estimate value */
    value: number;
    /** Lower bound of confidence interval */
    ciLo?: number;
    /** Upper bound of confidence interval */
    ciHi?: number;
    /** Standard error */
    se?: number;
    /** Variance */
    variance?: number;
    /** Log-transformed value (for ratio measures) */
    logValue?: number;
    /** Raw text from which the measure was extracted */
    raw: string;
    /** Surrounding context text */
    context: string;
    /** Character position in source text */
    position: number;
    /** Whether this is the primary outcome measure */
    isPrimary?: boolean;
    /** Confidence score (0-1) for extraction accuracy */
    confidence?: number;
    /** p-value if available */
    pValue?: number;
    /** Outcome name associated with this measure */
    outcome?: string;
}

/**
 * Demographic data structure
 */
export interface DemographicData {
    /** Mean age in years */
    ageMean?: number;
    /** Standard deviation of age */
    ageSD?: number;
    /** Age range as string (e.g., "18-65") */
    ageRange?: string;
    /** Median age in years */
    ageMedian?: number;
    /** Interquartile range for age */
    ageIQR?: string;
    /** Percentage of male participants */
    malePct?: number;
    /** Percentage of female participants */
    femalePct?: number;
    /** Race/ethnicity breakdown */
    race?: Record<string, number>;
    /** BMI mean */
    bmiMean?: number;
    /** BMI standard deviation */
    bmiSD?: number;
    /** Baseline characteristics */
    baseline?: Record<string, number | string>;
}

/**
 * Screening information
 */
export interface ScreeningData {
    /** Number screened */
    screened?: number;
    /** Number excluded */
    excluded?: number;
    /** Number randomized */
    randomized?: number;
    /** Exclusion reasons */
    reasons?: string[];
}

/**
 * Population/sample size data
 */
export interface PopulationData {
    /** Total sample size */
    totalN?: number;
    /** Treatment/intervention arm sample size */
    treatmentN?: number;
    /** Control/comparator arm sample size */
    controlN?: number;
    /** Number of clusters in treatment arm (cluster RCTs) */
    treatmentClusters?: number;
    /** Number of clusters in control arm (cluster RCTs) */
    controlClusters?: number;
    /** Inclusion criteria */
    inclusion?: string[];
    /** Exclusion criteria */
    exclusion?: string[];
    /** Demographic characteristics */
    demographics?: DemographicData;
    /** Screening information */
    screening?: ScreeningData;
    /** Intention-to-treat population */
    ittN?: number;
    /** Per-protocol population */
    ppN?: number;
    /** Safety population */
    safetyN?: number;
}

/**
 * Study identification
 */
export interface StudyInfo {
    /** Trial acronym (e.g., "DAPA-HF") */
    acronym?: string;
    /** Full trial name */
    fullName?: string;
    /** ClinicalTrials.gov NCT number */
    nctNumber?: string;
    /** Other registry ID (ISRCTN, EudraCT, etc.) */
    registryId?: string;
    /** Author names */
    authors?: string[];
    /** Publication year */
    year?: number;
    /** Journal name */
    journal?: string;
    /** Digital Object Identifier */
    doi?: string;
    /** PubMed ID */
    pmid?: string;
    /** Study phase (I, II, III, IV) */
    phase?: string;
    /** Country/countries where study conducted */
    countries?: string[];
    /** Number of study sites */
    sites?: number;
    /** Funding source */
    funding?: string;
    /** Sponsor */
    sponsor?: string;
    /** Study design (parallel, crossover, factorial) */
    design?: string;
    /** Randomization method */
    randomization?: string;
    /** Blinding type */
    blinding?: string;
}

/**
 * Outcome definition
 */
export interface OutcomeData {
    /** Primary outcome description */
    primary?: string;
    /** Secondary outcomes */
    secondary?: string[];
    /** Safety/adverse event outcomes */
    safetyOutcomes?: string[];
    /** Components of composite outcome */
    compositeComponents?: string[];
    /** Whether primary outcome is time-to-event */
    timeToEvent?: boolean;
    /** Follow-up duration description */
    followUpDuration?: string;
    /** Follow-up duration in months (normalized) */
    followUpMonths?: number;
    /** Assessment timepoints */
    assessmentTimepoints?: string[];
    /** Median follow-up */
    medianFollowUp?: string;
}

/**
 * Intervention/treatment details
 */
export interface InterventionData {
    /** Intervention name */
    name?: string;
    /** Drug/device class */
    class?: string;
    /** Dosage information */
    dose?: string;
    /** Route of administration */
    route?: string;
    /** Duration of treatment */
    duration?: string;
    /** Frequency of administration */
    frequency?: string;
    /** Titration protocol if applicable */
    titration?: string;
    /** Mechanism of action */
    mechanism?: string;
}

/**
 * Comparator/control details
 */
export interface ComparatorData {
    /** Comparator name */
    name?: string;
    /** Dose */
    dose?: string;
    /** Duration */
    duration?: string;
    /** Type of control */
    type?: 'placebo' | 'active' | 'usual_care' | 'sham' | 'other';
}

/**
 * Risk of Bias 2.0 assessment
 */
export interface RiskOfBias {
    /** Domain 1: Randomization process */
    randomization?: RiskLevel;
    /** Domain 2: Deviations from intended interventions */
    deviations?: RiskLevel;
    /** Domain 3: Missing outcome data */
    missingData?: RiskLevel;
    /** Domain 4: Measurement of the outcome */
    measurement?: RiskLevel;
    /** Domain 5: Selection of reported result */
    selection?: RiskLevel;
    /** Overall risk of bias judgment */
    overall?: RiskLevel;
    /** Justifications for each domain judgment */
    justifications?: Record<string, string>;
    /** Supporting quotes from the paper */
    supportingQuotes?: Record<string, string>;
    /** Signaling questions responses */
    signalingQuestions?: Record<string, Record<string, string>>;
}

/**
 * ROBINS-I assessment for non-randomized studies
 */
export interface RobinsI {
    /** Confounding */
    confounding?: RiskLevel;
    /** Selection */
    selection?: RiskLevel;
    /** Classification of interventions */
    interventionClassification?: RiskLevel;
    /** Deviations from intended interventions */
    deviations?: RiskLevel;
    /** Missing data */
    missingData?: RiskLevel;
    /** Measurement of outcomes */
    measurement?: RiskLevel;
    /** Selection of reported result */
    reportedResult?: RiskLevel;
    /** Overall judgment */
    overall?: RiskLevel;
    /** Justifications */
    justifications?: Record<string, string>;
}

/**
 * GRADE certainty assessment
 */
export interface GRADEAssessment {
    /** Risk of bias downgrade */
    riskOfBias?: SeverityLevel;
    /** Inconsistency downgrade */
    inconsistency?: SeverityLevel;
    /** Indirectness downgrade */
    indirectness?: SeverityLevel;
    /** Imprecision downgrade */
    imprecision?: SeverityLevel;
    /** Publication bias downgrade */
    publicationBias?: SeverityLevel;
    /** Upgrade factors (large effect, dose-response, etc.) */
    upgradeFactors?: string[];
    /** Overall certainty of evidence */
    overallCertainty?: CertaintyLevel;
    /** Explanation of rating */
    explanation?: string;
    /** Number of studies */
    numberOfStudies?: number;
    /** Total participants */
    totalParticipants?: number;
}

/**
 * Non-inferiority trial information
 */
export interface NonInferiorityData {
    /** Whether this is a non-inferiority trial */
    isNonInferiority: boolean;
    /** Non-inferiority margin */
    margin?: number;
    /** Conclusion of non-inferiority test */
    conclusion?: 'met' | 'not_met' | 'inconclusive';
    /** One-sided or two-sided test */
    testType?: 'one-sided' | 'two-sided';
}

/**
 * Audit trail for provenance
 */
export interface AuditTrail {
    /** Unique extraction ID */
    extractionId?: string;
    /** Timestamp of extraction */
    timestamp?: string;
    /** Extractor version */
    version?: string;
    /** Processing time in milliseconds */
    processingTime?: number;
    /** Warnings generated during extraction */
    warnings?: string[];
    /** Source file or URL */
    source?: string;
    /** User or system that performed extraction */
    performer?: string;
}

/**
 * Quality metrics
 */
export interface QualityMetrics {
    /** Overall quality score (0-100) */
    score?: number;
    /** Completeness score (0-100) */
    completeness?: number;
    /** Confidence score (0-1) */
    confidence?: number;
    /** Quality grade */
    grade?: QualityGrade;
}

/**
 * Internal metadata
 */
export interface ExtractionMetadata {
    /** Detected domain */
    domain?: TherapeuticDomain;
    /** Domain display name */
    domainName?: string;
    /** Domain detection confidence */
    domainConfidence?: number;
    /** Quality score details */
    qualityScore?: {
        score: number;
        grade: string;
    };
    /** Bias assessment results */
    biasAssessment?: {
        rob2?: RiskOfBias;
        robinsI?: RobinsI;
    };
    /** Text statistics */
    textStats?: {
        wordCount: number;
        sentenceCount: number;
        pageCount?: number;
    };
}

/**
 * Complete extraction result
 */
export interface ExtractionResult {
    /** Study identification information */
    study?: StudyInfo;
    /** Population and sample data */
    population?: PopulationData;
    /** Intervention/treatment details */
    intervention?: InterventionData;
    /** Comparator/control details */
    comparator?: ComparatorData;
    /** Outcome definitions */
    outcomes?: OutcomeData;
    /** Extracted effect measures by type */
    effectMeasures?: {
        hazardRatios?: EffectMeasure[];
        relativeRisks?: EffectMeasure[];
        oddsRatios?: EffectMeasure[];
        riskDifferences?: EffectMeasure[];
        meanDifferences?: EffectMeasure[];
        rateRatios?: EffectMeasure[];
        numberNeededToTreat?: EffectMeasure[];
        numberNeededToHarm?: EffectMeasure[];
        incidenceRateRatios?: EffectMeasure[];
        standardizedMeanDifferences?: EffectMeasure[];
        /** Primary effect measure (auto-selected) */
        primary?: EffectMeasure;
    };
    /** Primary contrast for meta-analysis */
    contrast?: {
        effect?: number;
        ciLo?: number;
        ciHi?: number;
        se?: number;
        pValue?: number;
        measureType?: string;
    };
    /** Risk of Bias 2.0 assessment */
    riskOfBias?: RiskOfBias;
    /** ROBINS-I assessment (for non-RCTs) */
    robinsI?: RobinsI;
    /** GRADE certainty assessment */
    grade?: GRADEAssessment;
    /** Quality metrics */
    quality?: QualityMetrics;
    /** Detected therapeutic domain */
    domain?: TherapeuticDomain;
    /** Non-inferiority trial information */
    nonInferiority?: NonInferiorityData;
    /** Audit trail for provenance */
    auditTrail?: AuditTrail;
    /** Internal metadata */
    _meta?: ExtractionMetadata;
    /** QC results (if QC was run) */
    _qc?: QCResult;
    /** PDF metadata (if extracted from PDF) */
    _pdfMetadata?: PdfMetadata;
    /** Extracted tables (if PDF) */
    _pdfTables?: ExtractedTable[];
}

// ============================================================
// OPTIONS TYPES
// ============================================================

/**
 * Extraction options
 */
export interface ExtractionOptions {
    /** Enable AI-enhanced extraction (default: true) */
    enableAI?: boolean;
    /** Enable verbose logging (default: false) */
    verbose?: boolean;
    /** Use strict validation mode */
    strictMode?: boolean;
    /** Override domain detection */
    domain?: TherapeuticDomain;
    /** Output format preference */
    outputFormat?: 'json' | 'csv';
    /** Include risk of bias assessment */
    includeRoB?: boolean;
    /** Include GRADE assessment */
    includeGRADE?: boolean;
    /** Include PRISMA compliance check */
    includePRISMA?: boolean;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Run QC checks */
    runQC?: boolean;
    /** QC preset to use */
    qcPreset?: QCPreset;
}

/**
 * PDF extraction options
 */
export interface PdfExtractionOptions extends ExtractionOptions {
    /** Keep references section (default: false) */
    keepReferences?: boolean;
    /** Reconstruct paragraphs (default: true) */
    reconstructParagraphs?: boolean;
    /** Extract table data (default: false) */
    extractTables?: boolean;
    /** Maximum pages to extract */
    maxPages?: number;
    /** Clean PDF artifacts */
    cleanArtifacts?: boolean;
    /** Remove headers and footers */
    removeHeadersFooters?: boolean;
}

// ============================================================
// VALIDATION TYPES
// ============================================================

/**
 * Validation report
 */
export interface ValidationReport {
    summary: {
        studyName: string;
        extractionId: string;
        timestamp: string;
        overallAccuracy: string;
        fieldsValidated: number;
        fieldsCorrect: number;
    };
    metrics: {
        precision: number;
        recall: number;
        f1Score: number;
        accuracy?: number;
    };
    fieldDetails: Record<string, {
        extracted: unknown;
        groundTruth: unknown;
        correct: boolean;
        error?: string;
    }>;
    errors: string[];
    warnings: string[];
    recommendation: string;
}

/**
 * Batch extraction result
 */
export interface BatchResult {
    /** File name */
    file: string;
    /** Full file path */
    path: string;
    /** Whether extraction succeeded */
    success: boolean;
    /** Extraction result if successful */
    result?: ExtractionResult;
    /** Error message if failed */
    error?: string;
    /** Processing time in milliseconds */
    processingTime?: number;
}

/**
 * Progress callback for batch operations
 */
export interface BatchProgressCallback {
    (current: number, total: number, file: string, status: 'processing' | 'done' | 'error'): void;
}

/**
 * Metafor export result
 */
export interface MetaforExport {
    /** CSV format string */
    csvFormat: string;
    /** R code for analysis */
    rCode: string;
    /** Study data */
    studies: Array<{
        study: string;
        yi: number;
        vi: number;
        sei?: number;
        ni?: number;
    }>;
}

// ============================================================
// PDF TYPES
// ============================================================

/**
 * PDF metadata
 */
export interface PdfMetadata {
    /** Original file name */
    fileName: string;
    /** Full file path */
    filePath: string;
    /** Number of pages */
    pageCount: number;
    /** PDF info dictionary */
    info: Record<string, unknown>;
    /** Extraction timestamp */
    extractedAt: string;
    /** PDF version */
    version?: string;
    /** File size in bytes */
    fileSize?: number;
}

/**
 * Extracted table structure
 */
export interface ExtractedTable {
    /** Table headers */
    headers: string[];
    /** Table rows */
    rows: string[][];
    /** Position in text */
    position: number;
    /** Start line number */
    startLine?: number;
    /** End line number */
    endLine?: number;
    /** Table caption if found */
    caption?: string;
}

/**
 * PDF extraction result
 */
export interface PdfExtractionResult {
    /** Extracted text */
    text: string;
    /** PDF metadata */
    metadata: PdfMetadata;
    /** Extracted tables */
    tables?: ExtractedTable[];
}

// ============================================================
// QC MODULE TYPES
// ============================================================

/**
 * QC preset names
 */
export type QCPreset = 'strict' | 'lenient' | 'cochrane' | 'regulatory' | 'default';

/**
 * QC issue
 */
export interface QCIssue {
    /** Issue code */
    code: string;
    /** Issue message */
    message: string;
    /** Field name */
    field?: string;
    /** Severity level */
    severity: IssueSeverity;
    /** Extracted value */
    value?: unknown;
    /** Expected value or range */
    expected?: unknown;
    /** Suggested fix */
    suggestion?: string;
}

/**
 * QC validation result for a single field
 */
export interface QCFieldResult {
    /** Field name */
    field: string;
    /** Whether validation passed */
    valid: boolean;
    /** Value that was checked */
    value?: unknown;
    /** Issues found */
    issues: QCIssue[];
    /** Confidence score */
    confidence?: number;
}

/**
 * Complete QC result
 */
export interface QCResult {
    /** Overall quality score (0-100) */
    qualityScore: number;
    /** Quality grade */
    grade: QualityGrade;
    /** Whether data passes QC */
    valid: boolean;
    /** Number of errors */
    errorCount: number;
    /** Number of warnings */
    warningCount: number;
    /** All issues found */
    issues: QCIssue[];
    /** Results by field */
    fieldResults: Record<string, QCFieldResult>;
    /** Completeness score */
    completeness: number;
    /** Consistency score */
    consistency: number;
    /** Domain used for QC */
    domain?: TherapeuticDomain;
    /** Preset used */
    preset?: QCPreset;
    /** Timestamp */
    timestamp: string;
}

/**
 * QC checker options
 */
export interface QCOptions {
    /** Domain for domain-specific rules */
    domain?: TherapeuticDomain;
    /** Preset to use */
    preset?: QCPreset;
    /** Custom rules */
    customRules?: QCRule[];
    /** Whether to throw on error */
    throwOnError?: boolean;
}

/**
 * QC rule definition
 */
export interface QCRule {
    /** Rule ID */
    id: string;
    /** Rule name */
    name: string;
    /** Field(s) this rule applies to */
    fields: string[];
    /** Validation function */
    validate: (value: unknown, context: QCRuleContext) => QCRuleResult;
    /** Severity if rule fails */
    severity: IssueSeverity;
    /** Whether rule is enabled */
    enabled?: boolean;
}

/**
 * Context passed to QC rule validators
 */
export interface QCRuleContext {
    /** Full extraction result */
    extraction: ExtractionResult;
    /** Domain */
    domain?: TherapeuticDomain;
    /** Other field values */
    fields: Record<string, unknown>;
}

/**
 * Result from a QC rule validation
 */
export interface QCRuleResult {
    /** Whether validation passed */
    valid: boolean;
    /** Error message if failed */
    message?: string;
    /** Suggestion for fixing */
    suggestion?: string;
}

// ============================================================
// VISUALIZATION TYPES
// ============================================================

/**
 * Forest plot study data
 */
export interface ForestPlotStudy {
    /** Study name */
    study: string;
    /** Effect estimate */
    effect: number;
    /** Lower CI bound */
    ciLo: number;
    /** Upper CI bound */
    ciHi: number;
    /** Standard error */
    se?: number;
    /** Weight in meta-analysis */
    weight?: number;
    /** Sample size */
    n?: number;
    /** Subgroup */
    subgroup?: string;
}

/**
 * Forest plot data
 */
export interface ForestPlotData {
    /** Individual studies */
    studies: ForestPlotStudy[];
    /** Pooled estimate */
    pooled?: {
        effect: number;
        ciLo: number;
        ciHi: number;
        model: 'fixed' | 'random';
    };
    /** Heterogeneity statistics */
    heterogeneity?: {
        i2: number;
        tau2: number;
        q: number;
        pValue: number;
    };
    /** Effect measure type */
    measureType: EffectMeasureType;
    /** Plot title */
    title?: string;
}

/**
 * Funnel plot data
 */
export interface FunnelPlotData {
    /** Study data points */
    studies: Array<{
        study: string;
        effect: number;
        se: number;
    }>;
    /** Pooled effect (for center line) */
    pooledEffect: number;
    /** Publication bias tests */
    biasTests?: {
        eggers?: { intercept: number; pValue: number };
        beggs?: { correlation: number; pValue: number };
        trimAndFill?: { adjustedEffect: number; missingStudies: number };
    };
}

/**
 * Risk of Bias visualization data
 */
export interface RoBVisualizationData {
    /** Studies with RoB assessments */
    studies: Array<{
        study: string;
        domains: Record<string, RiskLevel>;
        overall: RiskLevel;
    }>;
    /** Domain labels */
    domainLabels: string[];
}

/**
 * GRADE visualization data
 */
export interface GRADEVisualizationData {
    /** Outcomes with GRADE assessments */
    outcomes: Array<{
        outcome: string;
        certainty: CertaintyLevel;
        effect: string;
        domains: Record<string, SeverityLevel>;
        participants: number;
        studies: number;
    }>;
}

/**
 * Visualization export options
 */
export interface VizExportOptions {
    /** Output format */
    format: 'svg' | 'png' | 'html' | 'pdf';
    /** File name (without extension) */
    filename?: string;
    /** Width in pixels */
    width?: number;
    /** Height in pixels */
    height?: number;
    /** DPI for raster formats */
    dpi?: number;
    /** Include interactive features (HTML only) */
    interactive?: boolean;
}

// ============================================================
// AUDIT/LOGGING TYPES
// ============================================================

/**
 * Audit event types
 */
export enum AuditEventType {
    EXTRACTION_START = 'EXTRACTION_START',
    EXTRACTION_COMPLETE = 'EXTRACTION_COMPLETE',
    EXTRACTION_ERROR = 'EXTRACTION_ERROR',
    VALIDATION_START = 'VALIDATION_START',
    VALIDATION_COMPLETE = 'VALIDATION_COMPLETE',
    PDF_PARSE = 'PDF_PARSE',
    BATCH_START = 'BATCH_START',
    BATCH_COMPLETE = 'BATCH_COMPLETE',
    QC_CHECK = 'QC_CHECK',
    API_REQUEST = 'API_REQUEST',
    API_RESPONSE = 'API_RESPONSE',
    CONFIG_CHANGE = 'CONFIG_CHANGE',
    SYSTEM_ERROR = 'SYSTEM_ERROR'
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
    /** Unique entry ID */
    id: string;
    /** Timestamp */
    timestamp: string;
    /** Event type */
    eventType: AuditEventType;
    /** Log level */
    level: LogLevel;
    /** Event message */
    message: string;
    /** Additional data */
    data?: Record<string, unknown>;
    /** User or system identifier */
    actor?: string;
    /** Request ID for tracing */
    requestId?: string;
    /** Duration in milliseconds */
    duration?: number;
}

/**
 * Audit logger options
 */
export interface AuditLoggerOptions {
    /** Application name */
    appName?: string;
    /** Minimum log level */
    logLevel?: LogLevel;
    /** Log directory */
    logDir?: string;
    /** Log to console */
    console?: boolean;
    /** Log to file */
    file?: boolean;
    /** Log format */
    format?: 'json' | 'text';
    /** Rotation interval */
    rotateInterval?: 'hourly' | 'daily' | 'weekly';
    /** Max log files to keep */
    maxFiles?: number;
    /** Compress old logs */
    compress?: boolean;
}

// ============================================================
// BATCH PROCESSING TYPES
// ============================================================

/**
 * Batch processing options
 */
export interface BatchProcessingOptions {
    /** Number of concurrent workers */
    concurrency?: number;
    /** Retry count for failed items */
    retries?: number;
    /** Delay between retries (ms) */
    retryDelay?: number;
    /** Progress callback */
    onProgress?: BatchProgressCallback;
    /** Continue on error */
    continueOnError?: boolean;
    /** Enable checkpointing */
    checkpoint?: boolean;
    /** Checkpoint file path */
    checkpointPath?: string;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
    /** Total items processed */
    total: number;
    /** Successful extractions */
    successful: number;
    /** Failed extractions */
    failed: number;
    /** Skipped items */
    skipped: number;
    /** Individual results */
    results: BatchResult[];
    /** Processing time in milliseconds */
    processingTime: number;
    /** Start time */
    startTime: string;
    /** End time */
    endTime: string;
}

// ============================================================
// CACHE TYPES
// ============================================================

/**
 * Cache configuration
 */
export interface CacheConfig {
    /** Cache type */
    type: 'memory' | 'disk' | 'redis' | 'multi';
    /** Time-to-live in milliseconds */
    ttl?: number;
    /** Maximum cache size (entries) */
    maxSize?: number;
    /** Cache directory (for disk cache) */
    cacheDir?: string;
    /** Redis URL (for Redis cache) */
    redisUrl?: string;
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
    /** Cached value */
    value: T;
    /** Expiration timestamp */
    expiresAt: number;
    /** Cache key */
    key: string;
    /** Size in bytes (estimated) */
    size?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    /** Number of cache hits */
    hits: number;
    /** Number of cache misses */
    misses: number;
    /** Hit rate (0-1) */
    hitRate: number;
    /** Current size */
    size: number;
    /** Maximum size */
    maxSize: number;
    /** Number of evictions */
    evictions: number;
}

// ============================================================
// SCRAPER TYPES
// ============================================================

/**
 * Scraper options
 */
export interface ScraperOptions {
    /** Enable verbose logging */
    verbose?: boolean;
    /** Request timeout (ms) */
    timeout?: number;
    /** User agent string */
    userAgent?: string;
    /** Respect robots.txt */
    respectRobots?: boolean;
    /** Rate limit (requests per second) */
    rateLimit?: number;
    /** Enable caching */
    cache?: boolean;
    /** Retry count */
    retries?: number;
}

/**
 * Scraped article data
 */
export interface ScrapedArticle {
    /** Article URL */
    url: string;
    /** Article title */
    title: string;
    /** Authors */
    authors?: string[];
    /** Abstract text */
    abstract?: string;
    /** Full text (if available) */
    fullText?: string;
    /** Publication date */
    publicationDate?: string;
    /** Journal name */
    journal?: string;
    /** DOI */
    doi?: string;
    /** PubMed ID */
    pmid?: string;
    /** Whether full text was available */
    fullTextAvailable: boolean;
    /** Paywall encountered */
    paywalled?: boolean;
    /** Structured abstract sections */
    structuredAbstract?: Record<string, string>;
    /** Keywords */
    keywords?: string[];
    /** Source parser used */
    parser: string;
    /** Scrape timestamp */
    scrapedAt: string;
}

// ============================================================
// SERVER TYPES
// ============================================================

/**
 * API request for extraction
 */
export interface ExtractRequest {
    /** Text content to extract from */
    text?: string;
    /** URL to fetch and extract */
    url?: string;
    /** Extraction options */
    options?: ExtractionOptions;
}

/**
 * API response for extraction
 */
export interface ExtractResponse {
    /** Whether request succeeded */
    success: boolean;
    /** Extraction result */
    data?: ExtractionResult;
    /** Error message if failed */
    error?: string;
    /** Request ID */
    requestId: string;
    /** Processing time (ms) */
    processingTime: number;
}

/**
 * Health check response
 */
export interface HealthResponse {
    /** Service status */
    status: 'healthy' | 'degraded' | 'unhealthy';
    /** Version info */
    version: string;
    /** Uptime in seconds */
    uptime: number;
    /** Memory usage */
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    /** Component health */
    components: Record<string, {
        status: 'up' | 'down';
        responseTime?: number;
    }>;
}

// ============================================================
// MAIN CLASS DECLARATIONS
// ============================================================

/**
 * Main RCT extraction class
 */
export class RCTExtractor {
    /** Current version */
    static version: string;

    /**
     * Create a new RCTExtractor instance
     * @param config - Configuration options
     */
    constructor(config?: ExtractionOptions);

    /**
     * Extract RCT data from text
     * @param text - The text content to extract from
     * @param options - Extraction options (overrides constructor config)
     * @returns Extracted RCT data
     */
    extract(text: string, options?: ExtractionOptions): ExtractionResult;

    /**
     * Static extraction method
     * @param text - The text content to extract from
     * @param options - Extraction options
     * @returns Extracted RCT data
     */
    static extract(text: string, options?: ExtractionOptions): ExtractionResult;

    /**
     * Extract effect measures from text
     */
    extractEffectMeasures(text: string): ExtractionResult['effectMeasures'];

    /**
     * Extract population data from text
     */
    extractPopulation(text: string): PopulationData;

    /**
     * Extract study identification from text
     */
    extractStudyInfo(text: string): StudyInfo;

    /**
     * Extract outcome definitions from text
     */
    extractOutcomes(text: string): OutcomeData;

    /**
     * Assess risk of bias
     */
    assessRiskOfBias(text: string): RiskOfBias;

    /**
     * Assess GRADE certainty
     */
    assessGRADE(text: string): GRADEAssessment;

    /**
     * Get human-readable summary of extraction results
     */
    static getSummary(result: ExtractionResult): string;

    /**
     * Convert results to metafor format for R
     */
    static toMetafor(result: ExtractionResult): MetaforExport;

    /**
     * Export multiple results to metafor format
     */
    static exportMetaforFormat(results: ExtractionResult[]): MetaforExport;
}

/**
 * Quality Checker class
 */
export class QualityChecker {
    constructor(options?: QCOptions);

    /**
     * Run full QC check
     */
    check(data: ExtractionResult): QCResult;

    /**
     * Quick check returning just score and grade
     */
    quickCheck(data: ExtractionResult): {
        score: number;
        grade: QualityGrade;
        valid: boolean;
        issueCount: number;
        warningCount: number;
    };

    /**
     * Add custom rule
     */
    addRule(rule: QCRule): void;

    /**
     * Remove rule by ID
     */
    removeRule(ruleId: string): void;
}

/**
 * QC Report Generator class
 */
export class QCReportGenerator {
    constructor(options?: { title?: string; includeCharts?: boolean });

    /**
     * Generate HTML report
     */
    generateHTML(qcResult: QCResult): string;

    /**
     * Generate JSON report
     */
    generateJSON(qcResult: QCResult): string;

    /**
     * Generate CSV report
     */
    generateCSV(qcResult: QCResult): string;

    /**
     * Generate batch HTML report
     */
    generateBatchHTML(qcResults: QCResult[], options?: { title?: string }): string;
}

/**
 * Audit Logger class
 */
export class AuditLogger {
    constructor(options?: AuditLoggerOptions);

    /**
     * Log an event
     */
    log(level: LogLevel, eventType: AuditEventType, message: string, data?: Record<string, unknown>): void;

    /**
     * Log debug message
     */
    debug(eventType: AuditEventType, message: string, data?: Record<string, unknown>): void;

    /**
     * Log info message
     */
    info(eventType: AuditEventType, message: string, data?: Record<string, unknown>): void;

    /**
     * Log warning message
     */
    warn(eventType: AuditEventType, message: string, data?: Record<string, unknown>): void;

    /**
     * Log error message
     */
    error(eventType: AuditEventType, message: string, data?: Record<string, unknown>): void;

    /**
     * Get log entries
     */
    getEntries(filter?: { level?: LogLevel; eventType?: AuditEventType; startTime?: Date; endTime?: Date }): AuditLogEntry[];

    /**
     * Close logger
     */
    close(): Promise<void>;
}

/**
 * Batch Processor class
 */
export class BatchProcessor {
    constructor(options?: BatchProcessingOptions);

    /**
     * Process batch of items
     */
    process<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        options?: BatchProcessingOptions
    ): Promise<BatchProcessingResult>;

    /**
     * Resume from checkpoint
     */
    resume(checkpointPath: string): Promise<BatchProcessingResult>;

    /**
     * Cancel processing
     */
    cancel(): void;
}

/**
 * RCT Scraper class
 */
export class RCTScraper {
    constructor(options?: ScraperOptions);

    /**
     * Fetch article from URL
     */
    fetchArticle(url: string): Promise<ScrapedArticle>;

    /**
     * Fetch article by PMID
     */
    fetchByPMID(pmid: string): Promise<ScrapedArticle>;

    /**
     * Fetch multiple articles
     */
    fetchMultiple(urls: string[], options?: { concurrency?: number }): Promise<ScrapedArticle[]>;

    /**
     * Fetch multiple by PMIDs
     */
    fetchByPMIDs(pmids: string[], options?: { concurrency?: number }): Promise<ScrapedArticle[]>;
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Extract RCT data from text content
 * @param text - The text content to extract from
 * @param options - Extraction options
 * @returns Extracted RCT data
 */
export function extract(text: string, options?: ExtractionOptions): ExtractionResult;

/**
 * Extract RCT data from a PDF file
 * @param pdfPath - Path to the PDF file
 * @param options - Extraction options
 * @returns Promise resolving to extracted RCT data
 */
export function extractFromPdf(pdfPath: string, options?: PdfExtractionOptions): Promise<ExtractionResult>;

/**
 * Batch extract from multiple PDF files
 * @param pdfPaths - Array of PDF file paths
 * @param options - Extraction options
 * @returns Promise resolving to array of extraction results
 */
export function extractFromPdfs(pdfPaths: string[], options?: PdfExtractionOptions): Promise<BatchResult[]>;

/**
 * Create a new RCTExtractor instance with custom configuration
 * @param config - Configuration options
 * @returns Configured extractor instance
 */
export function createExtractor(config?: ExtractionOptions): RCTExtractor;

/**
 * Validate extraction results against ground truth
 * @param extracted - Extracted data
 * @param groundTruth - Ground truth data
 * @returns Validation report
 */
export function validate(extracted: ExtractionResult, groundTruth: ExtractionResult): ValidationReport;

/**
 * Calculate semantic similarity between two terms
 * @param term1 - First term
 * @param term2 - Second term
 * @returns Similarity score (0-1)
 */
export function similarity(term1: string, term2: string): number;

/**
 * Get the package version
 * @returns Package version string
 */
export function getVersion(): string;

/**
 * Extract with quality control
 * @param text - The text content to extract from
 * @param options - Extraction and QC options
 * @returns Extracted RCT data with QC results
 */
export function extractWithQC(text: string, options?: ExtractionOptions & QCOptions): ExtractionResult;

/**
 * Extract from PDF with quality control
 * @param pdfPath - Path to the PDF file
 * @param options - Extraction and QC options
 * @returns Promise resolving to extracted RCT data with QC results
 */
export function extractFromPdfWithQC(pdfPath: string, options?: PdfExtractionOptions & QCOptions): Promise<ExtractionResult>;

/**
 * Run quality control on extraction result
 * @param extractionResult - Result from extract() or extractFromPdf()
 * @param options - QC options (domain, preset)
 * @returns QC result with score, grade, issues, etc.
 */
export function runQC(extractionResult: ExtractionResult, options?: QCOptions): QCResult;

/**
 * Quick quality check - returns just score and grade
 * @param extractionResult - Result from extract() or extractFromPdf()
 * @param options - QC options (domain, preset)
 * @returns Quick QC result
 */
export function quickQC(extractionResult: ExtractionResult, options?: QCOptions): {
    score: number;
    grade: QualityGrade;
    valid: boolean;
    issueCount: number;
    warningCount: number;
};

/**
 * Generate QC report in HTML format
 * @param qcResult - Result from runQC()
 * @param options - Report options
 * @returns HTML report
 */
export function generateQCReport(qcResult: QCResult, options?: { title?: string; includeCharts?: boolean }): string;

// ============================================================
// AI/ML MODULE EXPORTS
// ============================================================

/**
 * Local AI processing module
 */
export const LocalAI: {
    /** Module version */
    version: string;

    /**
     * Process text with AI enhancements
     */
    process(text: string): {
        domain: TherapeuticDomain;
        entities: Array<{
            text: string;
            type: string;
            start: number;
            end: number;
        }>;
        sections: {
            results: Array<{ text: string; position: number }>;
            methods: Array<{ text: string; position: number }>;
            baseline: Array<{ text: string; position: number }>;
        };
        processingTime: number;
        version: string;
    };

    /**
     * Calculate semantic similarity between terms
     */
    similarity(term1: string, term2: string): number;

    /**
     * Find similar medical terms
     */
    findSimilar(term: string, topK?: number): string[];

    /**
     * Calibrate extraction confidence
     */
    calibrateConfidence(extraction: unknown, context: unknown): number;

    /**
     * Predict missing fields based on domain
     */
    predictMissingFields(extracted: ExtractionResult, domain: TherapeuticDomain): string[];

    /**
     * Validate extraction completeness
     */
    validateExtraction(extracted: ExtractionResult, domain: TherapeuticDomain): {
        isComplete: boolean;
        missingFields: string[];
        suggestions: string[];
    };
};

/**
 * AI extraction strategies
 */
export const AIStrategies: {
    extractEffectMeasures(text: string): ExtractionResult['effectMeasures'];
    extractPopulation(text: string): PopulationData;
    extractStudyInfo(text: string): StudyInfo;
    detectDomain(text: string): { domain: TherapeuticDomain; confidence: number };
};

/**
 * Word embeddings for semantic matching
 */
export const WordEmbeddings: {
    /** Pre-trained medical term vectors */
    vectors: Record<string, number[]>;

    /**
     * Calculate cosine similarity between terms
     */
    similarity(term1: string, term2: string): number;

    /**
     * Get embedding vector for a term
     */
    getVector(term: string): number[] | null;

    /**
     * Find most similar terms
     */
    findSimilar(term: string, topK?: number): Array<{ term: string; similarity: number }>;
};

/**
 * Naive Bayes classifier for domain detection
 */
export const NaiveBayesClassifier: {
    /**
     * Classify text into domain
     */
    classify(text: string): { domain: TherapeuticDomain; confidence: number; probabilities: Record<string, number> };

    /**
     * Train classifier on labeled documents
     */
    train(documents: Array<{ text: string; label: string }>): void;

    /**
     * Get feature weights for interpretation
     */
    getFeatureWeights(domain: string): Array<{ feature: string; weight: number }>;
};

/**
 * Medical Named Entity Recognition
 */
export const MedicalNER: {
    /**
     * Extract medical entities from text
     */
    extract(text: string): Array<{
        entity: string;
        type: 'drug' | 'disease' | 'biomarker' | 'procedure' | 'anatomical' | 'other';
        start: number;
        end: number;
        confidence: number;
    }>;

    /**
     * Get supported entity types
     */
    getEntityTypes(): string[];
};

/**
 * Confidence calibration module
 */
export const ConfidenceCalibrator: {
    /**
     * Calibrate raw confidence score
     */
    calibrate(rawConfidence: number, context: { field: string; domain?: TherapeuticDomain }): number;

    /**
     * Get calibration parameters
     */
    getParameters(): Record<string, number>;
};

/**
 * Field prediction for missing data
 */
export const FieldPredictor: {
    /**
     * Predict values for missing fields
     */
    predictMissing(extracted: ExtractionResult, domain: TherapeuticDomain): string[];

    /**
     * Get prediction confidence
     */
    getPredictionConfidence(field: string, value: unknown): number;
};

/**
 * Semantic search for document sections
 */
export const SemanticSearch: {
    /**
     * Search for relevant passages
     */
    search(query: string, documents: string[], topK?: number): Array<{
        document: string;
        score: number;
        index: number;
    }>;

    /**
     * Find section containing specific information
     */
    findSection(query: string, text: string): { text: string; start: number; end: number } | null;
};

/**
 * Ensemble extractor combining multiple methods
 */
export const EnsembleExtractor: {
    /**
     * Extract using ensemble of methods
     */
    extract(text: string, options?: { methods?: string[] }): ExtractionResult;

    /**
     * Get extraction confidence breakdown
     */
    getConfidenceBreakdown(result: ExtractionResult): Record<string, {
        method: string;
        confidence: number;
    }>;
};

// ============================================================
// QUALITY AND VALIDATION EXPORTS
// ============================================================

/**
 * Quality scoring module
 */
export const QualityScorer: {
    /**
     * Calculate overall quality score
     */
    score(extraction: ExtractionResult): number;

    /**
     * Get detailed quality breakdown
     */
    getDetails(extraction: ExtractionResult): {
        completeness: number;
        consistency: number;
        confidence: number;
        breakdown: Record<string, number>;
    };

    /**
     * Get quality grade (A-F)
     */
    getGrade(extraction: ExtractionResult): QualityGrade;
};

/**
 * Bias detection module
 */
export const BiasDetector: {
    /**
     * Detect risk of bias
     */
    detect(extraction: ExtractionResult): RiskOfBias;

    /**
     * Get supporting evidence for bias assessment
     */
    getEvidence(text: string, domain: TherapeuticDomain): Record<string, {
        quotes: string[];
        judgment: RiskLevel;
    }>;
};

/**
 * Validation framework
 */
export const ValidationFramework: {
    /**
     * Compare extraction to ground truth
     */
    compareToGroundTruth(extracted: ExtractionResult, groundTruth: ExtractionResult): {
        matches: string[];
        mismatches: string[];
        missing: string[];
        extra: string[];
    };

    /**
     * Calculate precision, recall, and F1
     */
    calculatePRF(extracted: ExtractionResult, groundTruth: ExtractionResult, fields?: string[]): {
        precision: number;
        recall: number;
        f1Score: number;
    };

    /**
     * Validate batch of extractions
     */
    batchValidate(extractions: ExtractionResult[], groundTruths: ExtractionResult[]): {
        overall: { precision: number; recall: number; f1Score: number };
        byStudy: Array<{ study: string; metrics: { precision: number; recall: number; f1Score: number } }>;
    };

    /**
     * Generate detailed validation report
     */
    generateValidationReport(extracted: ExtractionResult, groundTruth: ExtractionResult): ValidationReport;

    /**
     * Export validation report as CSV
     */
    exportValidationCSV(validationReport: ValidationReport): string;
};

// ============================================================
// PDF UTILITY EXPORTS
// ============================================================

/**
 * Extract text from a PDF file
 * @param pdfPath - Path to the PDF file
 * @param options - Extraction options
 * @returns Promise resolving to extracted text and metadata
 */
export function extractPdfText(pdfPath: string, options?: PdfExtractionOptions): Promise<PdfExtractionResult>;

/**
 * Extract text from PDF and process with RCTExtractor
 * @param pdfPath - Path to the PDF file
 * @param options - Extraction options
 * @returns Promise resolving to extraction result with PDF metadata
 */
export function extractAndProcess(pdfPath: string, options?: PdfExtractionOptions): Promise<ExtractionResult & {
    _pdfMetadata: PdfMetadata;
    _pdfTables?: ExtractedTable[];
}>;

/**
 * Batch extract from multiple PDFs
 * @param pdfPaths - Array of PDF file paths
 * @param options - Extraction options
 * @returns Promise resolving to array of batch results
 */
export function batchExtract(pdfPaths: string[], options?: PdfExtractionOptions): Promise<BatchResult[]>;

/**
 * List PDF files in a directory
 * @param directory - Directory path
 * @param recursive - Whether to recurse into subdirectories
 * @returns Array of PDF file paths
 */
export function listPdfFiles(directory: string, recursive?: boolean): string[];

/**
 * Detect if text has column layout
 * @param text - Text to analyze
 * @returns True if two-column layout detected
 */
export function detectColumnLayout(text: string): boolean;

/**
 * Remove headers and footers from text
 * @param text - Text with headers/footers
 * @returns Cleaned text
 */
export function removeHeadersFooters(text: string): string;

/**
 * Reconstruct paragraphs from fragmented text
 * @param text - Fragmented text
 * @returns Text with reconstructed paragraphs
 */
export function reconstructParagraphs(text: string): string;

/**
 * Remove reference section from text
 * @param text - Full text
 * @param keepReferences - Whether to keep references (default: false)
 * @returns Text with references removed
 */
export function removeReferences(text: string, keepReferences?: boolean): string;

/**
 * Clean PDF extraction artifacts
 * @param text - Text with artifacts
 * @returns Cleaned text
 */
export function cleanPdfArtifacts(text: string): string;

/**
 * Extract tables from text
 * @param text - Text containing potential tables
 * @returns Object with text and extracted tables
 */
export function extractTables(text: string): {
    text: string;
    tables: ExtractedTable[];
};

// ============================================================
// VISUALIZATION EXPORTS
// ============================================================

/**
 * Visualization module
 */
export const viz: {
    forest: {
        prepareForestData(results: ExtractionResult[], options?: object): ForestPlotData;
        generateSVG(data: ForestPlotData, options?: object): string;
        generateD3Data(data: ForestPlotData, options?: object): object;
        calculatePooledEstimate(studies: ForestPlotStudy[], model?: 'fixed' | 'random'): object;
    };
    funnel: {
        prepareFunnelData(results: ExtractionResult[], options?: object): FunnelPlotData;
        generateSVG(data: FunnelPlotData, options?: object): string;
        generateD3Data(data: FunnelPlotData, options?: object): object;
        eggersTest(studies: Array<{ effect: number; se: number }>): { intercept: number; pValue: number };
        beggsTest(studies: Array<{ effect: number; se: number }>): { correlation: number; pValue: number };
        trimAndFill(studies: Array<{ effect: number; se: number }>): { adjustedEffect: number; missingStudies: number };
    };
    rob: {
        prepareRoBData(results: ExtractionResult[], options?: object): RoBVisualizationData;
        generateMatrixSVG(data: RoBVisualizationData, options?: object): string;
        generateTrafficLightSVG(data: RoBVisualizationData, options?: object): string;
        generateD3Data(data: RoBVisualizationData, options?: object): object;
        ROB2_DOMAINS: string[];
        RISK_LEVELS: Record<RiskLevel, { color: string; label: string }>;
    };
    grade: {
        prepareGradeData(results: ExtractionResult[], options?: object): GRADEVisualizationData;
        generateSVG(data: GRADEVisualizationData, options?: object): string;
        generateD3Data(data: GRADEVisualizationData, options?: object): object;
        GRADE_DOMAINS: string[];
        CERTAINTY_LEVELS: Record<CertaintyLevel, { color: string; label: string; symbol: string }>;
    };
    export: {
        exportSVG(svg: string, options?: VizExportOptions): string;
        exportInteractiveHTML(data: object, type: string, options?: VizExportOptions): string;
        saveToFile(content: string, outputPath: string): Promise<string>;
    };
    generateAllVisualizations(results: ExtractionResult[], options?: object): {
        forest: object | null;
        funnel: object | null;
        rob: object | null;
        grade: object | null;
        errors: Array<{ type: string; error: string }>;
    };
    forestPlot(results: ExtractionResult[], options?: object): string;
    funnelPlot(results: ExtractionResult[], options?: object): string;
    robMatrix(results: ExtractionResult[], options?: object): string;
    robSummary(results: ExtractionResult[], options?: object): string;
    gradeTable(results: ExtractionResult[], options?: object): string;
    generateInteractiveReport(results: ExtractionResult[], options?: object): {
        forest: string | null;
        funnel: string | null;
        rob: string | null;
    };
};

/**
 * Quick forest plot generation
 */
export function forestPlot(results: ExtractionResult[], options?: object): string;

/**
 * Quick funnel plot generation
 */
export function funnelPlot(results: ExtractionResult[], options?: object): string;

/**
 * Quick RoB matrix generation
 */
export function robMatrix(results: ExtractionResult[], options?: object): string;

/**
 * Quick RoB summary generation
 */
export function robSummary(results: ExtractionResult[], options?: object): string;

/**
 * Quick GRADE table generation
 */
export function gradeTable(results: ExtractionResult[], options?: object): string;

/**
 * Generate all visualizations
 */
export function generateAllVisualizations(results: ExtractionResult[], options?: object): {
    forest: object | null;
    funnel: object | null;
    rob: object | null;
    grade: object | null;
    errors: Array<{ type: string; error: string }>;
};

/**
 * Generate interactive HTML report
 */
export function generateInteractiveReport(results: ExtractionResult[], options?: object): {
    forest: string | null;
    funnel: string | null;
    rob: string | null;
};

// ============================================================
// LIB MODULE EXPORTS
// ============================================================

/**
 * Library module
 */
export const lib: {
    audit: {
        AuditLogger: typeof AuditLogger;
        createAuditLogger(options?: AuditLoggerOptions): AuditLogger;
        getDefaultLogger(): AuditLogger;
        log(level: LogLevel, eventType: AuditEventType, message: string, data?: Record<string, unknown>): void;
        createExpressMiddleware(logger?: AuditLogger): import('express').RequestHandler;
        LOG_LEVELS: Record<LogLevel, number>;
        AUDIT_EVENT_TYPES: typeof AuditEventType;
    };
    batch: {
        BatchProcessor: typeof BatchProcessor;
        WorkerPool: new (options?: { size?: number }) => {
            execute<T>(fn: () => Promise<T>): Promise<T>;
            shutdown(): Promise<void>;
        };
        ProgressTracker: new () => {
            start(total: number): void;
            increment(): void;
            finish(): void;
            getProgress(): { current: number; total: number; percentage: number; eta: number };
        };
        CheckpointManager: new (path: string) => {
            save(state: object): Promise<void>;
            load(): Promise<object | null>;
            clear(): Promise<void>;
        };
        ResultsAggregator: new () => {
            add(result: BatchResult): void;
            getSummary(): BatchProcessingResult;
        };
        processBatch<T, R>(items: T[], processor: (item: T) => Promise<R>, options?: BatchProcessingOptions): Promise<BatchProcessingResult>;
        DEFAULT_CONFIG: BatchProcessingOptions;
    };
    cache: {
        Cache: new <T>(config?: CacheConfig) => {
            get(key: string): T | undefined;
            set(key: string, value: T, ttl?: number): void;
            has(key: string): boolean;
            delete(key: string): boolean;
            clear(): void;
            getStats(): CacheStats;
        };
        MultiLevelCache: new <T>(configs: CacheConfig[]) => {
            get(key: string): Promise<T | undefined>;
            set(key: string, value: T, ttl?: number): Promise<void>;
            invalidate(key: string): Promise<void>;
            clear(): Promise<void>;
        };
        MemoryCache: new <T>(options?: { maxSize?: number; ttl?: number }) => {
            get(key: string): T | undefined;
            set(key: string, value: T): void;
        };
        DiskCache: new <T>(options?: { cacheDir?: string; ttl?: number }) => {
            get(key: string): Promise<T | undefined>;
            set(key: string, value: T): Promise<void>;
        };
        RedisCache: new <T>(options?: { url?: string; ttl?: number }) => {
            get(key: string): Promise<T | undefined>;
            set(key: string, value: T): Promise<void>;
            connect(): Promise<void>;
            disconnect(): Promise<void>;
        };
        CacheKeyGenerator: {
            fromText(text: string): string;
            fromOptions(options: object): string;
            combine(...keys: string[]): string;
        };
        CacheInvalidator: new (cache: object) => {
            invalidatePattern(pattern: string): Promise<number>;
            invalidateOlderThan(timestamp: number): Promise<number>;
        };
        CachedExtractor: new (extractor: RCTExtractor, cache: object) => {
            extract(text: string, options?: ExtractionOptions): ExtractionResult;
            extractCached(text: string, options?: ExtractionOptions): Promise<ExtractionResult>;
        };
        createCache<T>(config?: CacheConfig): object;
        createMultiLevelCache<T>(configs?: CacheConfig[]): object;
        createCachedExtractor(extractor?: RCTExtractor, cacheConfig?: CacheConfig): object;
        DEFAULT_CONFIG: CacheConfig;
    };
};

/**
 * Create audit logger
 */
export function createAuditLogger(options?: AuditLoggerOptions): AuditLogger;

/**
 * Get default logger
 */
export function getDefaultLogger(): AuditLogger;

/**
 * Log audit event
 */
export function auditLog(level: LogLevel, eventType: AuditEventType, message: string, data?: Record<string, unknown>): void;

/**
 * Create Express audit middleware
 */
export function createAuditMiddleware(logger?: AuditLogger): import('express').RequestHandler;

/**
 * Log levels
 */
export const LOG_LEVELS: Record<LogLevel, number>;

/**
 * Audit event types
 */
export const AUDIT_EVENT_TYPES: typeof AuditEventType;

// ============================================================
// QC MODULE EXPORTS
// ============================================================

/**
 * QC module
 */
export const QC: {
    QualityChecker: typeof QualityChecker;
    QCReportGenerator: typeof QCReportGenerator;
    RuleManager: {
        getAvailablePresets(): string[];
        getSupportedDomains(): string[];
        getPreset(name: QCPreset): QCRule[];
        getDomainRules(domain: TherapeuticDomain): QCRule[];
    };
    NumericValidator: new () => {
        validate(value: number, fieldName: string, context?: object): QCFieldResult;
    };
    CIValidator: new () => {
        validate(effect: number, ciLo: number, ciHi: number, measureType?: EffectMeasureType): QCFieldResult;
    };
    ConsistencyValidator: new () => {
        validate(data: ExtractionResult): QCFieldResult;
    };
    CompletenessValidator: new (context?: object) => {
        validate(data: ExtractionResult, context?: object): QCFieldResult;
    };
    quickCheck(data: ExtractionResult, options?: QCOptions): { score: number; grade: QualityGrade; valid: boolean };
    check(data: ExtractionResult, options?: QCOptions): QCResult;
    validateCI(effect: number, ciLo: number, ciHi: number, measureType?: EffectMeasureType): QCFieldResult;
    validateNumeric(value: number, fieldName: string, context?: object): QCFieldResult;
    checkCompleteness(data: ExtractionResult, context?: object): QCFieldResult;
    generateHTMLReport(qcResult: QCResult, options?: object): string;
    generateJSONReport(qcResult: QCResult): string;
    generateBatchReport(qcResults: QCResult[], options?: object): string;
    getPresets(): string[];
    getDomains(): string[];
    SCORE_WEIGHTS: Record<string, number>;
    QUALITY_GRADES: Record<QualityGrade, { min: number; max: number; label: string }>;
    DEFAULT_RULES: QCRule[];
    DOMAIN_RULES: Record<TherapeuticDomain, QCRule[]>;
    RULE_PRESETS: Record<QCPreset, QCRule[]>;
    NUMERIC_FIELD_CONFIG: Record<string, { min: number; max: number; suspicious?: { min: number; max: number } }>;
    CI_RULES: Record<EffectMeasureType, object>;
    CONSISTENCY_RULES: QCRule[];
    REQUIRED_FIELDS: Record<string, string[]>;
    QUALITY_TIERS: Record<string, { fields: string[]; weight: number }>;
};

/**
 * Numeric validator
 */
export const NumericValidator: new () => {
    validate(value: number, fieldName: string, context?: object): QCFieldResult;
};

/**
 * CI validator
 */
export const CIValidator: new () => {
    validate(effect: number, ciLo: number, ciHi: number, measureType?: EffectMeasureType): QCFieldResult;
};

/**
 * Consistency validator
 */
export const ConsistencyValidator: new () => {
    validate(data: ExtractionResult): QCFieldResult;
};

/**
 * Completeness validator
 */
export const CompletenessValidator: new (context?: object) => {
    validate(data: ExtractionResult, context?: object): QCFieldResult;
};

/**
 * Rule manager
 */
export const RuleManager: {
    getAvailablePresets(): string[];
    getSupportedDomains(): string[];
    getPreset(name: QCPreset): QCRule[];
    getDomainRules(domain: TherapeuticDomain): QCRule[];
};

// ============================================================
// SCRAPER EXPORTS
// ============================================================

/**
 * Scraper module exports
 */
export const scraper: {
    RCTScraper: typeof RCTScraper;
    RateLimiter: new (options?: { requestsPerSecond?: number }) => {
        acquire(): Promise<void>;
        release(): void;
    };
    parsers: {
        PubMedParser: new () => { parse(html: string): ScrapedArticle };
        NEJMParser: new () => { parse(html: string): ScrapedArticle };
        LancetParser: new () => { parse(html: string): ScrapedArticle };
        BMJParser: new () => { parse(html: string): ScrapedArticle };
        JAMAParser: new () => { parse(html: string): ScrapedArticle };
        GenericParser: new () => { parse(html: string): ScrapedArticle };
    };
    PubMedParser: new () => { parse(html: string): ScrapedArticle };
    NEJMParser: new () => { parse(html: string): ScrapedArticle };
    LancetParser: new () => { parse(html: string): ScrapedArticle };
    BMJParser: new () => { parse(html: string): ScrapedArticle };
    JAMAParser: new () => { parse(html: string): ScrapedArticle };
    GenericParser: new () => { parse(html: string): ScrapedArticle };
    fetchArticle(url: string, options?: ScraperOptions): Promise<ScrapedArticle>;
    fetchByPMID(pmid: string, options?: ScraperOptions): Promise<ScrapedArticle>;
    fetchMultiple(urls: string[], options?: ScraperOptions): Promise<ScrapedArticle[]>;
    fetchByPMIDs(pmids: string[], options?: ScraperOptions): Promise<ScrapedArticle[]>;
    version: string;
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

declare const rctextractor: {
    // Main class
    RCTExtractor: typeof RCTExtractor;

    // Convenience functions
    extract: typeof extract;
    extractFromPdf: typeof extractFromPdf;
    extractFromPdfs: typeof extractFromPdfs;
    createExtractor: typeof createExtractor;
    validate: typeof validate;
    similarity: typeof similarity;
    getVersion: typeof getVersion;

    // QC functions
    extractWithQC: typeof extractWithQC;
    extractFromPdfWithQC: typeof extractFromPdfWithQC;
    runQC: typeof runQC;
    quickQC: typeof quickQC;
    generateQCReport: typeof generateQCReport;

    // Modules
    LocalAI: typeof LocalAI;
    AIStrategies: typeof AIStrategies;
    WordEmbeddings: typeof WordEmbeddings;
    NaiveBayesClassifier: typeof NaiveBayesClassifier;
    MedicalNER: typeof MedicalNER;
    ConfidenceCalibrator: typeof ConfidenceCalibrator;
    FieldPredictor: typeof FieldPredictor;
    SemanticSearch: typeof SemanticSearch;
    EnsembleExtractor: typeof EnsembleExtractor;
    QualityScorer: typeof QualityScorer;
    BiasDetector: typeof BiasDetector;
    ValidationFramework: typeof ValidationFramework;

    // QC module
    QC: typeof QC;
    QualityChecker: typeof QualityChecker;
    QCReportGenerator: typeof QCReportGenerator;
    RuleManager: typeof RuleManager;
    NumericValidator: typeof NumericValidator;
    CIValidator: typeof CIValidator;
    ConsistencyValidator: typeof ConsistencyValidator;
    CompletenessValidator: typeof CompletenessValidator;

    // PDF utilities
    extractPdfText: typeof extractPdfText;
    extractAndProcess: typeof extractAndProcess;
    batchExtract: typeof batchExtract;
    listPdfFiles: typeof listPdfFiles;
    detectColumnLayout: typeof detectColumnLayout;
    removeHeadersFooters: typeof removeHeadersFooters;
    reconstructParagraphs: typeof reconstructParagraphs;
    removeReferences: typeof removeReferences;
    cleanPdfArtifacts: typeof cleanPdfArtifacts;
    extractTables: typeof extractTables;

    // Visualization
    viz: typeof viz;
    forestPlot: typeof forestPlot;
    funnelPlot: typeof funnelPlot;
    robMatrix: typeof robMatrix;
    robSummary: typeof robSummary;
    gradeTable: typeof gradeTable;
    generateAllVisualizations: typeof generateAllVisualizations;
    generateInteractiveReport: typeof generateInteractiveReport;

    // Lib module
    lib: typeof lib;
    AuditLogger: typeof AuditLogger;
    createAuditLogger: typeof createAuditLogger;
    getDefaultLogger: typeof getDefaultLogger;
    auditLog: typeof auditLog;
    createAuditMiddleware: typeof createAuditMiddleware;
    LOG_LEVELS: typeof LOG_LEVELS;
    AUDIT_EVENT_TYPES: typeof AUDIT_EVENT_TYPES;
};

export default rctextractor;
