/**
 * Type definitions for rctextractor
 * AI-Enhanced RCT Data Extraction Engine
 *
 * @version 4.9.5
 */

declare module 'rctextractor' {
    // ============================================================
    // MAIN TYPES
    // ============================================================

    /**
     * Effect measure with confidence interval
     */
    export interface EffectMeasure {
        type: 'HR' | 'RR' | 'OR' | 'RD' | 'MD' | 'RateRatio' | 'NNT' | 'NNH';
        value: number;
        ciLo?: number;
        ciHi?: number;
        se?: number;
        variance?: number;
        logValue?: number;
        raw: string;
        context: string;
        position: number;
        isPrimary?: boolean;
    }

    /**
     * Population/sample size data
     */
    export interface PopulationData {
        totalN?: number;
        treatmentN?: number;
        controlN?: number;
        treatmentClusters?: number;
        controlClusters?: number;
        inclusion?: string[];
        exclusion?: string[];
        demographics?: {
            ageMean?: number;
            ageSD?: number;
            ageRange?: string;
            malePct?: number;
            femalePct?: number;
        };
    }

    /**
     * Study identification
     */
    export interface StudyInfo {
        acronym?: string;
        fullName?: string;
        nctNumber?: string;
        registryId?: string;
        authors?: string[];
        year?: number;
        journal?: string;
        doi?: string;
    }

    /**
     * Outcome definition
     */
    export interface OutcomeData {
        primary?: string;
        secondary?: string[];
        safetyOutcomes?: string[];
        compositeComponents?: string[];
        timeToEvent?: boolean;
        followUpDuration?: string;
    }

    /**
     * Risk of Bias 2.0 assessment
     */
    export interface RiskOfBias {
        randomization?: 'low' | 'some_concerns' | 'high';
        deviations?: 'low' | 'some_concerns' | 'high';
        missingData?: 'low' | 'some_concerns' | 'high';
        measurement?: 'low' | 'some_concerns' | 'high';
        selection?: 'low' | 'some_concerns' | 'high';
        overall?: 'low' | 'some_concerns' | 'high';
        justifications?: Record<string, string>;
    }

    /**
     * GRADE certainty assessment
     */
    export interface GRADEAssessment {
        riskOfBias?: 'no' | 'serious' | 'very_serious';
        inconsistency?: 'no' | 'serious' | 'very_serious';
        indirectness?: 'no' | 'serious' | 'very_serious';
        imprecision?: 'no' | 'serious' | 'very_serious';
        publicationBias?: 'no' | 'serious' | 'very_serious';
        upgradeFactors?: string[];
        overallCertainty?: 'high' | 'moderate' | 'low' | 'very_low';
    }

    /**
     * Complete extraction result
     */
    export interface ExtractionResult {
        study?: StudyInfo;
        population?: PopulationData;
        intervention?: {
            name?: string;
            dose?: string;
            duration?: string;
            route?: string;
        };
        comparator?: {
            name?: string;
            dose?: string;
            duration?: string;
        };
        outcomes?: OutcomeData;
        effectMeasures?: {
            hazardRatios?: EffectMeasure[];
            relativeRisks?: EffectMeasure[];
            oddsRatios?: EffectMeasure[];
            riskDifferences?: EffectMeasure[];
            meanDifferences?: EffectMeasure[];
            rateRatios?: EffectMeasure[];
            numberNeededToTreat?: EffectMeasure[];
            numberNeededToHarm?: EffectMeasure[];
        };
        contrast?: {
            effect?: number;
            ciLo?: number;
            ciHi?: number;
            se?: number;
            pValue?: number;
            measureType?: string;
        };
        riskOfBias?: RiskOfBias;
        grade?: GRADEAssessment;
        quality?: {
            score?: number;
            completeness?: number;
            confidence?: number;
        };
        domain?: string;
        auditTrail?: {
            extractionId?: string;
            timestamp?: string;
            version?: string;
            processingTime?: number;
        };
    }

    /**
     * Extraction options
     */
    export interface ExtractionOptions {
        enableAI?: boolean;
        verbose?: boolean;
        strictMode?: boolean;
        domain?: string;
        outputFormat?: 'json' | 'csv';
    }

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
        };
        fieldDetails: Record<string, {
            extracted: any;
            groundTruth: any;
            correct: boolean;
            error?: string;
        }>;
        errors: string[];
        warnings: string[];
        recommendation: string;
    }

    // ============================================================
    // MAIN CLASS
    // ============================================================

    /**
     * Main RCT extraction class
     */
    export class RCTExtractor {
        constructor(config?: ExtractionOptions);
        extract(text: string, options?: ExtractionOptions): ExtractionResult;
        extractEffectMeasures(text: string): ExtractionResult['effectMeasures'];
        extractPopulation(text: string): PopulationData;
        extractStudyInfo(text: string): StudyInfo;
        extractOutcomes(text: string): OutcomeData;
        assessRiskOfBias(text: string): RiskOfBias;
        assessGRADE(text: string): GRADEAssessment;
    }

    // ============================================================
    // CONVENIENCE FUNCTIONS
    // ============================================================

    /**
     * Extract RCT data from text content
     */
    export function extract(text: string, options?: ExtractionOptions): ExtractionResult;

    /**
     * Extract RCT data from a PDF file
     */
    export function extractFromPdf(pdfPath: string, options?: ExtractionOptions): Promise<ExtractionResult>;

    /**
     * Batch extract from multiple PDF files
     */
    export function extractFromPdfs(pdfPaths: string[], options?: ExtractionOptions): Promise<ExtractionResult[]>;

    /**
     * Create a new RCTExtractor instance with custom configuration
     */
    export function createExtractor(config?: ExtractionOptions): RCTExtractor;

    /**
     * Validate extraction results against ground truth
     */
    export function validate(extracted: ExtractionResult, groundTruth: ExtractionResult): ValidationReport;

    /**
     * Calculate semantic similarity between two terms
     */
    export function similarity(term1: string, term2: string): number;

    /**
     * Get the package version
     */
    export function getVersion(): string;

    // ============================================================
    // AI/ML MODULES
    // ============================================================

    export const LocalAI: {
        version: string;
        process(text: string): {
            domain: string;
            entities: any[];
            sections: {
                results: any[];
                methods: any[];
                baseline: any[];
            };
            processingTime: number;
            version: string;
        };
        similarity(term1: string, term2: string): number;
        findSimilar(term: string): string[];
        calibrateConfidence(extraction: any, context: any): number;
        predictMissingFields(extracted: any, domain: string): string[];
        validateExtraction(extracted: any, domain: string): { isComplete: boolean; missingFields: string[] };
    };

    export const AIStrategies: {
        extractEffectMeasures(text: string): ExtractionResult['effectMeasures'];
        extractPopulation(text: string): PopulationData;
        // ... other strategies
    };

    export const WordEmbeddings: {
        vectors: Record<string, number[]>;
        similarity(term1: string, term2: string): number;
        getVector(term: string): number[] | null;
        findSimilar(term: string, topK?: number): Array<{ term: string; similarity: number }>;
    };

    export const NaiveBayesClassifier: {
        classify(text: string): { domain: string; confidence: number };
        train(documents: Array<{ text: string; label: string }>): void;
    };

    export const MedicalNER: {
        extract(text: string): Array<{ entity: string; type: string; start: number; end: number }>;
    };

    export const ConfidenceCalibrator: {
        calibrate(rawConfidence: number, context: any): number;
    };

    export const FieldPredictor: {
        predictMissing(extracted: any, domain: string): string[];
    };

    export const SemanticSearch: {
        search(query: string, documents: string[], topK?: number): Array<{ document: string; score: number }>;
    };

    export const EnsembleExtractor: {
        extract(text: string): ExtractionResult;
    };

    // ============================================================
    // QUALITY AND VALIDATION
    // ============================================================

    export const QualityScorer: {
        score(extraction: ExtractionResult): number;
        getDetails(extraction: ExtractionResult): {
            completeness: number;
            consistency: number;
            confidence: number;
        };
    };

    export const BiasDetector: {
        detect(extraction: ExtractionResult): RiskOfBias;
    };

    export const ValidationFramework: {
        compareToGroundTruth(extracted: ExtractionResult, groundTruth: ExtractionResult): any;
        calculatePRF(extracted: ExtractionResult, groundTruth: ExtractionResult, fields: string[]): {
            precision: number;
            recall: number;
            f1Score: number;
        };
        batchValidate(extractions: ExtractionResult[], groundTruths: ExtractionResult[]): any;
        generateValidationReport(extracted: ExtractionResult, groundTruth: ExtractionResult): ValidationReport;
        exportValidationCSV(validationReport: ValidationReport): string;
    };

    // ============================================================
    // PDF UTILITIES
    // ============================================================

    /**
     * Extract text from a PDF file
     */
    export function extractPdfText(pdfPath: string): Promise<string>;

    /**
     * Extract text from PDF and process with RCTExtractor
     */
    export function extractAndProcess(pdfPath: string, options?: ExtractionOptions): Promise<ExtractionResult>;

    /**
     * Batch extract from multiple PDFs
     */
    export function batchExtract(pdfPaths: string[], options?: ExtractionOptions): Promise<Array<{
        file: string;
        success: boolean;
        result?: ExtractionResult;
        error?: string;
    }>>;

    /**
     * List PDF files in a directory
     */
    export function listPdfFiles(directory: string): string[];

    /**
     * Detect if text has column layout
     */
    export function detectColumnLayout(text: string): boolean;

    /**
     * Remove headers and footers from text
     */
    export function removeHeadersFooters(text: string): string;

    /**
     * Reconstruct paragraphs from fragmented text
     */
    export function reconstructParagraphs(text: string): string;

    /**
     * Remove reference section from text
     */
    export function removeReferences(text: string): string;

    /**
     * Clean PDF extraction artifacts
     */
    export function cleanPdfArtifacts(text: string): string;

    /**
     * Extract tables from text
     */
    export function extractTables(text: string): Array<{
        headers: string[];
        rows: string[][];
        position: number;
    }>;
}
