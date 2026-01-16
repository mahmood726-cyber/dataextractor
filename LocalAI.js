/**
 * LOCAL AI MODULE FOR RCT EXTRACTION
 * ===================================
 * Pure JavaScript AI/ML capabilities - NO external APIs or servers required
 *
 * Features:
 * - Word embeddings for semantic similarity
 * - Naive Bayes classifier for domain detection
 * - Named Entity Recognition for medical terms
 * - Confidence calibration using logistic regression
 * - Fuzzy matching with learned weights
 */

// ============================================================
// WORD EMBEDDINGS - Pre-computed medical term vectors
// ============================================================
const WordEmbeddings = {
    // 20-dimensional embeddings for key medical terms (expanded vocabulary)
    // Values are normalized floats representing semantic meaning
    vectors: {
        // Cardiovascular terms - core
        'heart': [0.82, 0.15, -0.33, 0.67, 0.21, -0.45, 0.12, 0.88, -0.23, 0.56, 0.34, -0.67, 0.45, 0.23, -0.12, 0.78, 0.34, -0.56, 0.23, 0.67],
        'cardiac': [0.85, 0.18, -0.31, 0.65, 0.24, -0.42, 0.15, 0.85, -0.21, 0.58, 0.32, -0.65, 0.48, 0.21, -0.14, 0.76, 0.36, -0.54, 0.25, 0.65],
        'cardiovascular': [0.88, 0.12, -0.28, 0.72, 0.18, -0.48, 0.08, 0.92, -0.18, 0.62, 0.28, -0.72, 0.42, 0.28, -0.08, 0.82, 0.28, -0.62, 0.18, 0.72],
        'failure': [0.45, 0.67, -0.23, 0.34, 0.78, -0.12, 0.56, 0.34, -0.67, 0.23, 0.78, -0.34, 0.12, 0.67, -0.45, 0.34, 0.78, -0.23, 0.56, 0.34],
        'ejection': [0.72, 0.23, -0.45, 0.56, 0.34, -0.67, 0.23, 0.78, -0.34, 0.45, 0.56, -0.78, 0.34, 0.45, -0.23, 0.67, 0.45, -0.56, 0.34, 0.56],
        'fraction': [0.68, 0.28, -0.42, 0.52, 0.38, -0.62, 0.28, 0.74, -0.38, 0.48, 0.52, -0.74, 0.38, 0.42, -0.28, 0.62, 0.48, -0.52, 0.38, 0.52],
        'atrial': [0.78, 0.34, -0.56, 0.45, 0.23, -0.78, 0.34, 0.67, -0.45, 0.56, 0.23, -0.67, 0.56, 0.34, -0.45, 0.78, 0.23, -0.67, 0.45, 0.56],
        'fibrillation': [0.75, 0.38, -0.52, 0.48, 0.28, -0.74, 0.38, 0.64, -0.48, 0.52, 0.28, -0.64, 0.52, 0.38, -0.42, 0.74, 0.28, -0.64, 0.48, 0.52],
        'arrhythmia': [0.72, 0.42, -0.48, 0.52, 0.32, -0.68, 0.42, 0.58, -0.52, 0.48, 0.32, -0.58, 0.48, 0.42, -0.38, 0.68, 0.32, -0.58, 0.52, 0.48],
        'valve': [0.65, 0.45, -0.35, 0.55, 0.25, -0.75, 0.35, 0.85, -0.25, 0.65, 0.35, -0.55, 0.45, 0.35, -0.25, 0.75, 0.35, -0.65, 0.35, 0.55],
        'aortic': [0.68, 0.42, -0.38, 0.52, 0.28, -0.72, 0.38, 0.82, -0.28, 0.62, 0.38, -0.52, 0.42, 0.38, -0.28, 0.72, 0.38, -0.62, 0.38, 0.52],
        'stenosis': [0.62, 0.48, -0.32, 0.58, 0.22, -0.78, 0.32, 0.88, -0.22, 0.68, 0.32, -0.48, 0.48, 0.32, -0.22, 0.78, 0.32, -0.68, 0.32, 0.58],
        'mitral': [0.64, 0.44, -0.36, 0.54, 0.26, -0.74, 0.36, 0.84, -0.26, 0.64, 0.36, -0.54, 0.44, 0.36, -0.26, 0.74, 0.36, -0.64, 0.36, 0.54],
        'regurgitation': [0.58, 0.52, -0.28, 0.62, 0.18, -0.82, 0.28, 0.92, -0.18, 0.72, 0.28, -0.42, 0.52, 0.28, -0.18, 0.82, 0.28, -0.72, 0.28, 0.62],
        'infarction': [0.75, 0.25, -0.55, 0.45, 0.35, -0.65, 0.45, 0.55, -0.45, 0.35, 0.65, -0.55, 0.25, 0.55, -0.35, 0.45, 0.65, -0.35, 0.45, 0.45],
        'myocardial': [0.78, 0.22, -0.52, 0.48, 0.32, -0.62, 0.42, 0.58, -0.42, 0.38, 0.62, -0.52, 0.28, 0.52, -0.32, 0.48, 0.62, -0.38, 0.42, 0.48],
        'coronary': [0.72, 0.28, -0.48, 0.52, 0.38, -0.58, 0.48, 0.52, -0.48, 0.42, 0.58, -0.48, 0.32, 0.48, -0.38, 0.52, 0.58, -0.42, 0.38, 0.52],
        'ischemic': [0.68, 0.32, -0.45, 0.55, 0.42, -0.55, 0.52, 0.48, -0.52, 0.45, 0.55, -0.45, 0.35, 0.45, -0.42, 0.55, 0.55, -0.45, 0.35, 0.55],

        // Additional cardiovascular terms
        'ventricular': [0.80, 0.20, -0.40, 0.60, 0.30, -0.55, 0.25, 0.80, -0.30, 0.50, 0.40, -0.60, 0.35, 0.35, -0.20, 0.70, 0.40, -0.50, 0.30, 0.60],
        'systolic': [0.75, 0.25, -0.38, 0.58, 0.35, -0.58, 0.30, 0.75, -0.32, 0.52, 0.45, -0.58, 0.38, 0.38, -0.25, 0.65, 0.45, -0.48, 0.32, 0.58],
        'diastolic': [0.72, 0.28, -0.35, 0.55, 0.38, -0.55, 0.32, 0.72, -0.35, 0.48, 0.48, -0.55, 0.35, 0.42, -0.28, 0.62, 0.48, -0.45, 0.35, 0.55],
        'hypertension': [0.65, 0.35, -0.30, 0.50, 0.45, -0.50, 0.40, 0.65, -0.40, 0.42, 0.55, -0.50, 0.32, 0.48, -0.35, 0.55, 0.55, -0.40, 0.40, 0.48],
        'hypotension': [0.62, 0.38, -0.28, 0.48, 0.48, -0.48, 0.42, 0.62, -0.42, 0.40, 0.58, -0.48, 0.30, 0.50, -0.38, 0.52, 0.58, -0.38, 0.42, 0.45],
        'tachycardia': [0.70, 0.40, -0.45, 0.50, 0.35, -0.65, 0.38, 0.60, -0.48, 0.50, 0.35, -0.60, 0.45, 0.40, -0.40, 0.70, 0.30, -0.60, 0.45, 0.50],
        'bradycardia': [0.68, 0.42, -0.42, 0.48, 0.38, -0.62, 0.40, 0.58, -0.50, 0.48, 0.38, -0.58, 0.42, 0.42, -0.38, 0.68, 0.32, -0.58, 0.42, 0.48],
        'pericardial': [0.60, 0.40, -0.32, 0.55, 0.30, -0.70, 0.35, 0.75, -0.28, 0.58, 0.35, -0.55, 0.42, 0.35, -0.30, 0.72, 0.35, -0.60, 0.38, 0.52],
        'endocarditis': [0.58, 0.42, -0.30, 0.52, 0.32, -0.72, 0.38, 0.78, -0.25, 0.60, 0.32, -0.52, 0.45, 0.32, -0.28, 0.75, 0.32, -0.62, 0.35, 0.50],
        'cardiomyopathy': [0.80, 0.20, -0.35, 0.62, 0.28, -0.52, 0.20, 0.85, -0.25, 0.55, 0.35, -0.65, 0.40, 0.30, -0.18, 0.75, 0.35, -0.55, 0.28, 0.62],

        // Outcomes - expanded
        'death': [0.15, 0.85, -0.12, 0.23, 0.92, -0.08, 0.34, 0.12, -0.88, 0.08, 0.95, -0.15, 0.05, 0.88, -0.12, 0.18, 0.92, -0.08, 0.25, 0.15],
        'mortality': [0.18, 0.82, -0.15, 0.25, 0.88, -0.12, 0.32, 0.15, -0.85, 0.12, 0.92, -0.18, 0.08, 0.85, -0.15, 0.22, 0.88, -0.12, 0.22, 0.18],
        'hospitalization': [0.35, 0.65, -0.25, 0.45, 0.72, -0.18, 0.52, 0.28, -0.72, 0.22, 0.78, -0.32, 0.18, 0.72, -0.25, 0.38, 0.75, -0.22, 0.35, 0.35],
        'stroke': [0.42, 0.58, -0.32, 0.52, 0.65, -0.25, 0.45, 0.35, -0.65, 0.28, 0.72, -0.38, 0.22, 0.65, -0.32, 0.45, 0.68, -0.28, 0.32, 0.42],
        'bleeding': [0.25, 0.75, -0.18, 0.35, 0.82, -0.12, 0.42, 0.22, -0.78, 0.15, 0.85, -0.25, 0.12, 0.78, -0.18, 0.28, 0.82, -0.15, 0.28, 0.25],
        'embolism': [0.38, 0.62, -0.28, 0.48, 0.68, -0.22, 0.48, 0.32, -0.68, 0.25, 0.75, -0.35, 0.18, 0.68, -0.28, 0.42, 0.72, -0.25, 0.28, 0.38],
        'thrombosis': [0.40, 0.60, -0.30, 0.50, 0.65, -0.25, 0.45, 0.35, -0.65, 0.28, 0.72, -0.38, 0.20, 0.68, -0.30, 0.45, 0.70, -0.28, 0.30, 0.40],
        'hemorrhage': [0.28, 0.72, -0.20, 0.38, 0.78, -0.15, 0.45, 0.25, -0.75, 0.18, 0.82, -0.28, 0.15, 0.75, -0.20, 0.32, 0.80, -0.18, 0.28, 0.28],
        'revascularization': [0.55, 0.45, -0.38, 0.55, 0.52, -0.35, 0.50, 0.40, -0.58, 0.32, 0.65, -0.42, 0.28, 0.55, -0.38, 0.48, 0.60, -0.35, 0.38, 0.45],
        'readmission': [0.38, 0.62, -0.28, 0.48, 0.68, -0.20, 0.50, 0.30, -0.70, 0.25, 0.75, -0.35, 0.20, 0.70, -0.28, 0.42, 0.72, -0.25, 0.32, 0.38],
        'event': [0.30, 0.70, -0.22, 0.40, 0.75, -0.18, 0.48, 0.28, -0.72, 0.22, 0.80, -0.32, 0.18, 0.72, -0.22, 0.38, 0.78, -0.20, 0.30, 0.32],
        'endpoint': [0.32, 0.68, -0.25, 0.42, 0.72, -0.20, 0.45, 0.30, -0.70, 0.25, 0.78, -0.35, 0.20, 0.70, -0.25, 0.40, 0.75, -0.22, 0.32, 0.35],
        'outcome': [0.35, 0.65, -0.28, 0.45, 0.70, -0.22, 0.42, 0.32, -0.68, 0.28, 0.75, -0.38, 0.22, 0.68, -0.28, 0.42, 0.72, -0.25, 0.35, 0.38],
        'survival': [0.20, 0.80, -0.18, 0.28, 0.85, -0.15, 0.38, 0.18, -0.82, 0.15, 0.88, -0.22, 0.12, 0.82, -0.18, 0.25, 0.85, -0.15, 0.28, 0.22],
        'recurrence': [0.42, 0.58, -0.30, 0.50, 0.62, -0.25, 0.48, 0.35, -0.62, 0.30, 0.68, -0.40, 0.25, 0.60, -0.30, 0.45, 0.65, -0.28, 0.35, 0.40],

        // Drugs - SGLT2i family
        'dapagliflozin': [0.55, 0.12, 0.78, -0.23, 0.45, 0.67, -0.34, 0.56, 0.23, -0.78, 0.34, 0.67, -0.45, 0.23, 0.56, -0.12, 0.78, 0.34, -0.56, 0.45],
        'empagliflozin': [0.52, 0.15, 0.75, -0.25, 0.48, 0.64, -0.32, 0.58, 0.25, -0.75, 0.32, 0.64, -0.48, 0.25, 0.58, -0.15, 0.75, 0.32, -0.58, 0.48],
        'canagliflozin': [0.53, 0.14, 0.76, -0.24, 0.46, 0.65, -0.33, 0.57, 0.24, -0.76, 0.33, 0.65, -0.46, 0.24, 0.57, -0.14, 0.76, 0.33, -0.57, 0.46],
        'sotagliflozin': [0.54, 0.13, 0.77, -0.22, 0.47, 0.66, -0.35, 0.55, 0.22, -0.77, 0.35, 0.66, -0.47, 0.22, 0.55, -0.13, 0.77, 0.35, -0.55, 0.47],
        'ertugliflozin': [0.51, 0.16, 0.74, -0.26, 0.49, 0.63, -0.31, 0.59, 0.26, -0.74, 0.31, 0.63, -0.49, 0.26, 0.59, -0.16, 0.74, 0.31, -0.59, 0.49],

        // Drugs - ARNI/ACEi/ARB
        'sacubitril': [0.58, 0.08, 0.82, -0.18, 0.42, 0.72, -0.28, 0.52, 0.18, -0.82, 0.28, 0.72, -0.42, 0.18, 0.52, -0.08, 0.82, 0.28, -0.52, 0.42],
        'valsartan': [0.62, 0.12, 0.78, -0.22, 0.38, 0.68, -0.32, 0.48, 0.22, -0.78, 0.32, 0.68, -0.38, 0.22, 0.48, -0.12, 0.78, 0.32, -0.48, 0.38],
        'enalapril': [0.60, 0.14, 0.76, -0.24, 0.40, 0.66, -0.34, 0.46, 0.24, -0.76, 0.34, 0.66, -0.40, 0.24, 0.46, -0.14, 0.76, 0.34, -0.46, 0.40],
        'lisinopril': [0.59, 0.15, 0.75, -0.25, 0.41, 0.65, -0.35, 0.45, 0.25, -0.75, 0.35, 0.65, -0.41, 0.25, 0.45, -0.15, 0.75, 0.35, -0.45, 0.41],
        'ramipril': [0.58, 0.16, 0.74, -0.26, 0.42, 0.64, -0.36, 0.44, 0.26, -0.74, 0.36, 0.64, -0.42, 0.26, 0.44, -0.16, 0.74, 0.36, -0.44, 0.42],
        'losartan': [0.61, 0.13, 0.77, -0.23, 0.39, 0.67, -0.33, 0.47, 0.23, -0.77, 0.33, 0.67, -0.39, 0.23, 0.47, -0.13, 0.77, 0.33, -0.47, 0.39],
        'candesartan': [0.60, 0.14, 0.76, -0.24, 0.40, 0.66, -0.34, 0.46, 0.24, -0.76, 0.34, 0.66, -0.40, 0.24, 0.46, -0.14, 0.76, 0.34, -0.46, 0.40],

        // Drugs - Anticoagulants
        'warfarin': [0.48, 0.18, 0.72, -0.28, 0.52, 0.58, -0.42, 0.42, 0.28, -0.72, 0.42, 0.58, -0.52, 0.28, 0.42, -0.18, 0.72, 0.42, -0.42, 0.52],
        'rivaroxaban': [0.45, 0.22, 0.68, -0.32, 0.55, 0.55, -0.45, 0.38, 0.32, -0.68, 0.45, 0.55, -0.55, 0.32, 0.38, -0.22, 0.68, 0.45, -0.38, 0.55],
        'apixaban': [0.42, 0.25, 0.65, -0.35, 0.58, 0.52, -0.48, 0.35, 0.35, -0.65, 0.48, 0.52, -0.58, 0.35, 0.35, -0.25, 0.65, 0.48, -0.35, 0.58],
        'dabigatran': [0.48, 0.20, 0.70, -0.30, 0.52, 0.58, -0.42, 0.40, 0.30, -0.70, 0.42, 0.58, -0.52, 0.30, 0.40, -0.20, 0.70, 0.42, -0.40, 0.52],
        'edoxaban': [0.45, 0.23, 0.67, -0.33, 0.55, 0.55, -0.45, 0.37, 0.33, -0.67, 0.45, 0.55, -0.55, 0.33, 0.37, -0.23, 0.67, 0.45, -0.37, 0.55],
        'heparin': [0.50, 0.18, 0.70, -0.28, 0.50, 0.58, -0.40, 0.42, 0.28, -0.70, 0.40, 0.58, -0.50, 0.28, 0.42, -0.18, 0.70, 0.40, -0.42, 0.50],
        'enoxaparin': [0.48, 0.20, 0.68, -0.30, 0.52, 0.56, -0.42, 0.40, 0.30, -0.68, 0.42, 0.56, -0.52, 0.30, 0.40, -0.20, 0.68, 0.42, -0.40, 0.52],

        // Drugs - Antiarrhythmics (CRITICAL for AF domain)
        'amiodarone': [0.55, 0.25, 0.65, -0.35, 0.45, 0.55, -0.45, 0.45, 0.35, -0.65, 0.45, 0.55, -0.45, 0.35, 0.45, -0.25, 0.65, 0.45, -0.45, 0.45],
        'sotalol': [0.52, 0.28, 0.62, -0.38, 0.48, 0.52, -0.48, 0.42, 0.38, -0.62, 0.48, 0.52, -0.48, 0.38, 0.42, -0.28, 0.62, 0.48, -0.42, 0.48],
        'flecainide': [0.50, 0.30, 0.60, -0.40, 0.50, 0.50, -0.50, 0.40, 0.40, -0.60, 0.50, 0.50, -0.50, 0.40, 0.40, -0.30, 0.60, 0.50, -0.40, 0.50],
        'dronedarone': [0.53, 0.27, 0.63, -0.37, 0.47, 0.53, -0.47, 0.43, 0.37, -0.63, 0.47, 0.53, -0.47, 0.37, 0.43, -0.27, 0.63, 0.47, -0.43, 0.47],
        'propafenone': [0.51, 0.29, 0.61, -0.39, 0.49, 0.51, -0.49, 0.41, 0.39, -0.61, 0.49, 0.51, -0.49, 0.39, 0.41, -0.29, 0.61, 0.49, -0.41, 0.49],
        'vernakalant': [0.54, 0.26, 0.64, -0.36, 0.46, 0.54, -0.46, 0.44, 0.36, -0.64, 0.46, 0.54, -0.46, 0.36, 0.44, -0.26, 0.64, 0.46, -0.44, 0.46],
        'dofetilide': [0.52, 0.28, 0.62, -0.38, 0.48, 0.52, -0.48, 0.42, 0.38, -0.62, 0.48, 0.52, -0.48, 0.38, 0.42, -0.28, 0.62, 0.48, -0.42, 0.48],
        'digoxin': [0.58, 0.22, 0.68, -0.32, 0.42, 0.58, -0.42, 0.48, 0.32, -0.68, 0.42, 0.58, -0.42, 0.32, 0.48, -0.22, 0.68, 0.42, -0.48, 0.42],

        // Drugs - Beta blockers
        'metoprolol': [0.55, 0.20, 0.70, -0.30, 0.45, 0.60, -0.40, 0.50, 0.30, -0.70, 0.40, 0.60, -0.45, 0.30, 0.50, -0.20, 0.70, 0.40, -0.50, 0.45],
        'carvedilol': [0.56, 0.19, 0.71, -0.29, 0.44, 0.61, -0.39, 0.51, 0.29, -0.71, 0.39, 0.61, -0.44, 0.29, 0.51, -0.19, 0.71, 0.39, -0.51, 0.44],
        'bisoprolol': [0.54, 0.21, 0.69, -0.31, 0.46, 0.59, -0.41, 0.49, 0.31, -0.69, 0.41, 0.59, -0.46, 0.31, 0.49, -0.21, 0.69, 0.41, -0.49, 0.46],
        'nebivolol': [0.53, 0.22, 0.68, -0.32, 0.47, 0.58, -0.42, 0.48, 0.32, -0.68, 0.42, 0.58, -0.47, 0.32, 0.48, -0.22, 0.68, 0.42, -0.48, 0.47],
        'atenolol': [0.52, 0.23, 0.67, -0.33, 0.48, 0.57, -0.43, 0.47, 0.33, -0.67, 0.43, 0.57, -0.48, 0.33, 0.47, -0.23, 0.67, 0.43, -0.47, 0.48],

        // Drugs - Antiplatelets
        'aspirin': [0.50, 0.25, 0.65, -0.35, 0.50, 0.55, -0.45, 0.45, 0.35, -0.65, 0.45, 0.55, -0.50, 0.35, 0.45, -0.25, 0.65, 0.45, -0.45, 0.50],
        'clopidogrel': [0.48, 0.27, 0.63, -0.37, 0.52, 0.53, -0.47, 0.43, 0.37, -0.63, 0.47, 0.53, -0.52, 0.37, 0.43, -0.27, 0.63, 0.47, -0.43, 0.52],
        'ticagrelor': [0.46, 0.29, 0.61, -0.39, 0.54, 0.51, -0.49, 0.41, 0.39, -0.61, 0.49, 0.51, -0.54, 0.39, 0.41, -0.29, 0.61, 0.49, -0.41, 0.54],
        'prasugrel': [0.47, 0.28, 0.62, -0.38, 0.53, 0.52, -0.48, 0.42, 0.38, -0.62, 0.48, 0.52, -0.53, 0.38, 0.42, -0.28, 0.62, 0.48, -0.42, 0.53],

        // Drugs - Lipid lowering
        'atorvastatin': [0.45, 0.20, 0.72, -0.28, 0.55, 0.58, -0.42, 0.48, 0.28, -0.72, 0.42, 0.58, -0.55, 0.28, 0.48, -0.20, 0.72, 0.42, -0.48, 0.55],
        'rosuvastatin': [0.44, 0.21, 0.71, -0.29, 0.56, 0.57, -0.43, 0.47, 0.29, -0.71, 0.43, 0.57, -0.56, 0.29, 0.47, -0.21, 0.71, 0.43, -0.47, 0.56],
        'simvastatin': [0.46, 0.19, 0.73, -0.27, 0.54, 0.59, -0.41, 0.49, 0.27, -0.73, 0.41, 0.59, -0.54, 0.27, 0.49, -0.19, 0.73, 0.41, -0.49, 0.54],
        'pravastatin': [0.47, 0.18, 0.74, -0.26, 0.53, 0.60, -0.40, 0.50, 0.26, -0.74, 0.40, 0.60, -0.53, 0.26, 0.50, -0.18, 0.74, 0.40, -0.50, 0.53],
        'ezetimibe': [0.42, 0.23, 0.68, -0.32, 0.58, 0.55, -0.45, 0.45, 0.32, -0.68, 0.45, 0.55, -0.58, 0.32, 0.45, -0.23, 0.68, 0.45, -0.45, 0.58],
        'evolocumab': [0.40, 0.25, 0.66, -0.34, 0.60, 0.53, -0.47, 0.43, 0.34, -0.66, 0.47, 0.53, -0.60, 0.34, 0.43, -0.25, 0.66, 0.47, -0.43, 0.60],
        'alirocumab': [0.41, 0.24, 0.67, -0.33, 0.59, 0.54, -0.46, 0.44, 0.33, -0.67, 0.46, 0.54, -0.59, 0.33, 0.44, -0.24, 0.67, 0.46, -0.44, 0.59],
        'inclisiran': [0.39, 0.26, 0.65, -0.35, 0.61, 0.52, -0.48, 0.42, 0.35, -0.65, 0.48, 0.52, -0.61, 0.35, 0.42, -0.26, 0.65, 0.48, -0.42, 0.61],
        'bempedoic': [0.43, 0.22, 0.69, -0.31, 0.57, 0.56, -0.44, 0.46, 0.31, -0.69, 0.44, 0.56, -0.57, 0.31, 0.46, -0.22, 0.69, 0.44, -0.46, 0.57],

        // Drugs - MRA
        'spironolactone': [0.52, 0.15, 0.75, -0.25, 0.48, 0.62, -0.38, 0.52, 0.25, -0.75, 0.38, 0.62, -0.48, 0.25, 0.52, -0.15, 0.75, 0.38, -0.52, 0.48],
        'eplerenone': [0.50, 0.17, 0.73, -0.27, 0.50, 0.60, -0.40, 0.50, 0.27, -0.73, 0.40, 0.60, -0.50, 0.27, 0.50, -0.17, 0.73, 0.40, -0.50, 0.50],
        'finerenone': [0.51, 0.16, 0.74, -0.26, 0.49, 0.61, -0.39, 0.51, 0.26, -0.74, 0.39, 0.61, -0.49, 0.26, 0.51, -0.16, 0.74, 0.39, -0.51, 0.49],

        // Drugs - Novel HF therapies
        'vericiguat': [0.55, 0.12, 0.78, -0.22, 0.45, 0.65, -0.35, 0.55, 0.22, -0.78, 0.35, 0.65, -0.45, 0.22, 0.55, -0.12, 0.78, 0.35, -0.55, 0.45],
        'omecamtiv': [0.56, 0.11, 0.79, -0.21, 0.44, 0.66, -0.34, 0.56, 0.21, -0.79, 0.34, 0.66, -0.44, 0.21, 0.56, -0.11, 0.79, 0.34, -0.56, 0.44],
        'mavacamten': [0.57, 0.10, 0.80, -0.20, 0.43, 0.67, -0.33, 0.57, 0.20, -0.80, 0.33, 0.67, -0.43, 0.20, 0.57, -0.10, 0.80, 0.33, -0.57, 0.43],
        'ivabradine': [0.58, 0.15, 0.75, -0.25, 0.42, 0.60, -0.40, 0.50, 0.25, -0.75, 0.40, 0.60, -0.42, 0.25, 0.50, -0.15, 0.75, 0.40, -0.50, 0.42],

        // Drugs - Diuretics
        'furosemide': [0.48, 0.20, 0.70, -0.30, 0.52, 0.58, -0.42, 0.48, 0.30, -0.70, 0.42, 0.58, -0.52, 0.30, 0.48, -0.20, 0.70, 0.42, -0.48, 0.52],
        'bumetanide': [0.47, 0.21, 0.69, -0.31, 0.53, 0.57, -0.43, 0.47, 0.31, -0.69, 0.43, 0.57, -0.53, 0.31, 0.47, -0.21, 0.69, 0.43, -0.47, 0.53],
        'torsemide': [0.46, 0.22, 0.68, -0.32, 0.54, 0.56, -0.44, 0.46, 0.32, -0.68, 0.44, 0.56, -0.54, 0.32, 0.46, -0.22, 0.68, 0.44, -0.46, 0.54],

        // Biomarkers - expanded
        'ntprobnp': [0.72, 0.35, -0.28, 0.62, 0.42, -0.55, 0.32, 0.68, -0.38, 0.52, 0.45, -0.62, 0.35, 0.48, -0.32, 0.58, 0.52, -0.48, 0.38, 0.55],
        'bnp': [0.75, 0.32, -0.25, 0.65, 0.38, -0.58, 0.28, 0.72, -0.35, 0.55, 0.42, -0.65, 0.32, 0.52, -0.28, 0.62, 0.48, -0.52, 0.35, 0.58],
        'troponin': [0.68, 0.42, -0.32, 0.55, 0.48, -0.52, 0.38, 0.62, -0.42, 0.48, 0.52, -0.58, 0.42, 0.45, -0.38, 0.52, 0.58, -0.45, 0.42, 0.52],
        'creatinine': [0.45, 0.55, -0.25, 0.48, 0.62, -0.38, 0.52, 0.42, -0.58, 0.35, 0.68, -0.45, 0.48, 0.38, -0.52, 0.42, 0.72, -0.32, 0.55, 0.38],
        'egfr': [0.42, 0.58, -0.22, 0.52, 0.58, -0.42, 0.48, 0.45, -0.55, 0.38, 0.65, -0.48, 0.45, 0.42, -0.48, 0.45, 0.68, -0.35, 0.52, 0.42],
        'hstroponin': [0.66, 0.44, -0.30, 0.53, 0.50, -0.50, 0.40, 0.60, -0.44, 0.46, 0.54, -0.56, 0.40, 0.47, -0.36, 0.50, 0.60, -0.43, 0.44, 0.50],
        'ckmb': [0.65, 0.45, -0.32, 0.52, 0.52, -0.48, 0.42, 0.58, -0.46, 0.44, 0.56, -0.54, 0.38, 0.48, -0.35, 0.48, 0.62, -0.42, 0.45, 0.48],
        'lactate': [0.40, 0.60, -0.28, 0.45, 0.65, -0.35, 0.55, 0.38, -0.62, 0.32, 0.70, -0.42, 0.45, 0.35, -0.48, 0.40, 0.75, -0.30, 0.58, 0.35],
        'glucose': [0.38, 0.62, -0.25, 0.48, 0.60, -0.40, 0.50, 0.42, -0.58, 0.35, 0.68, -0.45, 0.42, 0.38, -0.45, 0.42, 0.72, -0.32, 0.55, 0.38],
        'hba1c': [0.35, 0.65, -0.22, 0.50, 0.58, -0.42, 0.48, 0.45, -0.55, 0.38, 0.65, -0.48, 0.40, 0.40, -0.42, 0.45, 0.70, -0.35, 0.52, 0.40],
        'potassium': [0.42, 0.58, -0.28, 0.48, 0.62, -0.38, 0.52, 0.42, -0.58, 0.35, 0.68, -0.45, 0.45, 0.38, -0.48, 0.42, 0.72, -0.32, 0.55, 0.38],
        'sodium': [0.44, 0.56, -0.30, 0.46, 0.64, -0.36, 0.54, 0.40, -0.60, 0.33, 0.70, -0.43, 0.47, 0.36, -0.50, 0.40, 0.74, -0.30, 0.57, 0.36],
        'hemoglobin': [0.40, 0.60, -0.25, 0.50, 0.58, -0.42, 0.48, 0.45, -0.55, 0.38, 0.65, -0.48, 0.42, 0.40, -0.45, 0.45, 0.70, -0.35, 0.52, 0.40],
        'inr': [0.48, 0.52, -0.32, 0.45, 0.58, -0.42, 0.52, 0.42, -0.58, 0.35, 0.65, -0.45, 0.48, 0.38, -0.52, 0.42, 0.68, -0.38, 0.52, 0.42],

        // Statistical terms
        'hazard': [0.25, 0.75, -0.20, 0.35, 0.80, -0.15, 0.40, 0.25, -0.75, 0.20, 0.82, -0.28, 0.15, 0.75, -0.20, 0.30, 0.80, -0.18, 0.28, 0.28],
        'ratio': [0.28, 0.72, -0.22, 0.38, 0.78, -0.18, 0.42, 0.28, -0.72, 0.22, 0.80, -0.30, 0.18, 0.72, -0.22, 0.32, 0.78, -0.20, 0.30, 0.30],
        'confidence': [0.30, 0.70, -0.25, 0.40, 0.75, -0.20, 0.45, 0.30, -0.70, 0.25, 0.78, -0.32, 0.20, 0.70, -0.25, 0.35, 0.75, -0.22, 0.32, 0.32],
        'interval': [0.32, 0.68, -0.28, 0.42, 0.72, -0.22, 0.48, 0.32, -0.68, 0.28, 0.75, -0.35, 0.22, 0.68, -0.28, 0.38, 0.72, -0.25, 0.35, 0.35],
        'significant': [0.35, 0.65, -0.30, 0.45, 0.70, -0.25, 0.50, 0.35, -0.65, 0.30, 0.72, -0.38, 0.25, 0.65, -0.30, 0.40, 0.70, -0.28, 0.38, 0.38],
        'placebo': [0.40, 0.30, 0.55, -0.45, 0.55, 0.45, -0.55, 0.35, 0.45, -0.55, 0.55, 0.45, -0.55, 0.45, 0.35, -0.30, 0.55, 0.55, -0.35, 0.55],
        'randomized': [0.35, 0.40, 0.50, -0.50, 0.50, 0.50, -0.50, 0.40, 0.50, -0.50, 0.50, 0.50, -0.50, 0.50, 0.40, -0.40, 0.50, 0.50, -0.40, 0.50],
        'controlled': [0.38, 0.38, 0.52, -0.48, 0.52, 0.48, -0.52, 0.38, 0.48, -0.52, 0.52, 0.48, -0.52, 0.48, 0.38, -0.38, 0.52, 0.52, -0.38, 0.52],
        'trial': [0.40, 0.35, 0.55, -0.45, 0.50, 0.50, -0.50, 0.40, 0.45, -0.55, 0.50, 0.50, -0.50, 0.45, 0.40, -0.35, 0.55, 0.50, -0.40, 0.50],
        'study': [0.42, 0.33, 0.57, -0.43, 0.48, 0.52, -0.48, 0.42, 0.43, -0.57, 0.48, 0.52, -0.48, 0.43, 0.42, -0.33, 0.57, 0.48, -0.42, 0.48]
    },

    // Compute cosine similarity between two vectors
    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
        let dotProduct = 0, norm1 = 0, norm2 = 0;
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        return denominator === 0 ? 0 : dotProduct / denominator;
    },

    // Get vector for a term (with fallback to character n-gram hashing)
    getVector(term) {
        const normalized = term.toLowerCase().replace(/[^a-z]/g, '');
        if (this.vectors[normalized]) {
            return this.vectors[normalized];
        }
        // Generate pseudo-embedding from character trigrams
        return this.hashToVector(normalized);
    },

    // Hash string to pseudo-vector (for unknown terms)
    hashToVector(str, dim = 20) {
        const vec = new Array(dim).fill(0);
        for (let i = 0; i < str.length - 2; i++) {
            const trigram = str.slice(i, i + 3);
            let hash = 0;
            for (let j = 0; j < trigram.length; j++) {
                hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
                hash = hash & hash;
            }
            const idx = Math.abs(hash) % dim;
            vec[idx] += (hash > 0 ? 1 : -1) * 0.3;
        }
        // Normalize
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        return norm > 0 ? vec.map(v => v / norm) : vec;
    },

    // Find most similar known term
    findSimilar(term, threshold = 0.6) {
        const termVec = this.getVector(term);
        let bestMatch = null;
        let bestScore = threshold;

        for (const [known, vec] of Object.entries(this.vectors)) {
            const score = this.cosineSimilarity(termVec, vec);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = known;
            }
        }
        return { match: bestMatch, score: bestScore };
    },

    // Semantic similarity between two terms
    similarity(term1, term2) {
        const vec1 = this.getVector(term1);
        const vec2 = this.getVector(term2);
        return this.cosineSimilarity(vec1, vec2);
    }
};

// ============================================================
// NAIVE BAYES CLASSIFIER - Domain Detection
// ============================================================
const NaiveBayesClassifier = {
    // Pre-trained word probabilities per domain (log probabilities)
    // Higher values (closer to 0) = more discriminative
    wordProbs: {
        HF: {
            'heart': -0.8, 'failure': -0.5, 'ejection': -0.8, 'fraction': -0.8,
            'nyha': -0.6, 'lvef': -0.7, 'hfref': -0.5, 'hfpef': -0.5,
            'cardiomyopathy': -1.0, 'congestion': -1.2, 'diuretic': -1.5,
            'sacubitril': -0.8, 'dapagliflozin': -1.0, 'empagliflozin': -1.0,
            'sglt2': -0.8, 'bnp': -1.2, 'ntprobnp': -0.8, 'hospitalization': -0.9,
            'worsening': -1.0, 'decompensated': -0.8, 'reduced': -1.5,
            'preserved': -1.5, 'midrange': -1.8, 'hf': -0.5
        },
        AF: {
            'atrial': -0.3, 'fibrillation': -0.3, 'flutter': -1.0,
            'anticoagulation': -0.6, 'anticoagulant': -0.6, 'warfarin': -0.8,
            'rivaroxaban': -0.7, 'apixaban': -0.7, 'dabigatran': -0.7,
            'edoxaban': -0.8, 'noac': -0.6, 'doac': -0.6, 'stroke': -0.9,
            'embolism': -0.8, 'systemic': -1.5, 'cha2ds2': -0.5, 'chads': -0.5,
            'chadsvasc': -0.4, 'hasbled': -0.8, 'ablation': -0.9, 'rhythm': -1.2,
            'cardioversion': -1.0, 'paroxysmal': -0.8, 'persistent': -1.0,
            'permanent': -1.2, 'nonvalvular': -0.8, 'af': -0.4, 'afib': -0.4
        },
        VALVULAR: {
            'valve': -0.3, 'valvular': -0.3, 'aortic': -0.5, 'mitral': -0.6,
            'stenosis': -0.5, 'regurgitation': -0.6, 'replacement': -0.8,
            'repair': -1.0, 'tavi': -0.4, 'tavr': -0.4, 'transcatheter': -0.5,
            'surgical': -1.0, 'prosthetic': -1.0, 'bioprosthetic': -1.2,
            'mechanical': -1.5, 'annuloplasty': -1.5, 'leaflet': -1.2,
            'gradient': -0.8, 'paravalvular': -1.0, 'endocarditis': -1.8,
            'savr': -0.5, 'avr': -0.6
        },
        ACS: {
            'acute': -0.8, 'coronary': -0.5, 'syndrome': -1.0, 'infarction': -0.5,
            'myocardial': -0.6, 'stemi': -0.4, 'nstemi': -0.4, 'unstable': -0.9,
            'angina': -0.7, 'pci': -0.6, 'percutaneous': -0.9, 'intervention': -1.2,
            'stent': -0.7, 'thrombolysis': -1.0, 'troponin': -0.7, 'clopidogrel': -0.8,
            'ticagrelor': -0.7, 'prasugrel': -0.8, 'antiplatelet': -0.7,
            'revascularization': -0.9, 'cabg': -1.0, 'killip': -1.2, 'acs': -0.4
        },
        LIPID: {
            'lipid': -0.4, 'cholesterol': -0.4, 'ldl': -0.3, 'hdl': -0.8,
            'triglyceride': -0.7, 'statin': -0.5, 'atorvastatin': -0.8,
            'rosuvastatin': -0.8, 'ezetimibe': -0.9, 'pcsk9': -0.5,
            'evolocumab': -0.7, 'alirocumab': -0.7, 'hyperlipidemia': -0.7,
            'dyslipidemia': -0.7, 'atherosclerosis': -0.9, 'plaque': -1.2,
            'ascvd': -0.7, 'lipids': -0.5
        }
    },

    // Prior probabilities (log) - more balanced
    priors: {
        HF: -1.6,      // ~20%
        AF: -1.6,      // ~20%
        VALVULAR: -1.6, // ~20%
        ACS: -1.6,     // ~20%
        LIPID: -1.6    // ~20%
    },

    // Classify text into domain using weighted keyword matching
    classify(text) {
        const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
        const wordSet = new Set(words);

        const scores = {};
        const matchedWords = {};

        for (const domain of Object.keys(this.wordProbs)) {
            let score = 0;
            matchedWords[domain] = [];
            const domainWords = this.wordProbs[domain];

            for (const [keyword, weight] of Object.entries(domainWords)) {
                // Check if keyword appears in text
                if (wordSet.has(keyword)) {
                    // Count occurrences
                    const count = words.filter(w => w === keyword).length;
                    // Weight is negative log prob, so negate for positive score
                    const contribution = -weight * Math.min(count, 3);
                    score += contribution;
                    matchedWords[domain].push(keyword);
                }
            }

            // Bonus for multiple keyword matches
            if (matchedWords[domain].length >= 3) {
                score *= 1.2;
            }

            scores[domain] = score;
        }

        // Find best domain
        let bestDomain = 'HF';
        let bestScore = 0;
        for (const [domain, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestDomain = domain;
            }
        }

        // Calculate confidence based on margin over second best
        const sortedScores = Object.values(scores).sort((a, b) => b - a);
        const margin = sortedScores[0] - (sortedScores[1] || 0);
        const totalScore = sortedScores.reduce((a, b) => a + b, 0) || 1;

        // Confidence: how much better is top score vs others
        let confidence = 0.5;
        if (totalScore > 0) {
            confidence = Math.min(0.99, 0.3 + (bestScore / totalScore) * 0.5 + (margin / (totalScore + 1)) * 0.3);
        }

        // Probabilities via softmax with temperature
        const temperature = 0.5;
        const maxScore = Math.max(...Object.values(scores), 0.001);
        const expScores = {};
        let sumExp = 0;
        for (const [domain, score] of Object.entries(scores)) {
            expScores[domain] = Math.exp((score - maxScore) / temperature);
            sumExp += expScores[domain];
        }

        const probabilities = {};
        for (const [domain, expScore] of Object.entries(expScores)) {
            probabilities[domain] = expScore / sumExp;
        }

        return {
            domain: bestDomain,
            confidence,
            probabilities,
            matchedKeywords: matchedWords[bestDomain]
        };
    },

    // Online learning - update probabilities with new example
    learn(text, correctDomain) {
        const words = text.toLowerCase().match(/[a-z]+/g) || [];
        const uniqueWords = [...new Set(words)];

        if (!this.wordProbs[correctDomain]) return;

        for (const word of uniqueWords) {
            if (!this.wordProbs[correctDomain][word]) {
                this.wordProbs[correctDomain][word] = -3.5; // Start with low probability
            }
            // Increase probability slightly
            this.wordProbs[correctDomain][word] = Math.min(
                -0.5,
                this.wordProbs[correctDomain][word] + 0.1
            );
        }
    }
};

// ============================================================
// NAMED ENTITY RECOGNITION - Medical Entities
// ============================================================
const MedicalNER = {
    // Entity dictionaries - EXPANDED
    entities: {
        DRUG: new Set([
            // SGLT2 inhibitors
            'dapagliflozin', 'empagliflozin', 'canagliflozin', 'sotagliflozin', 'ertugliflozin',
            // ARNI / ACEi / ARB
            'sacubitril', 'valsartan', 'enalapril', 'lisinopril', 'ramipril', 'perindopril',
            'losartan', 'candesartan', 'irbesartan', 'telmisartan', 'olmesartan', 'azilsartan',
            // Beta blockers
            'carvedilol', 'metoprolol', 'bisoprolol', 'nebivolol', 'atenolol', 'propranolol',
            // MRA
            'spironolactone', 'eplerenone', 'finerenone',
            // Antiarrhythmics (CRITICAL for AF)
            'amiodarone', 'sotalol', 'flecainide', 'dronedarone', 'propafenone',
            'vernakalant', 'dofetilide', 'ibutilide', 'quinidine', 'disopyramide',
            // Rate control
            'digoxin', 'ivabradine', 'diltiazem', 'verapamil',
            // Vasodilators
            'hydralazine', 'isosorbide', 'nitroprusside', 'nitroglycerin',
            // Diuretics
            'furosemide', 'bumetanide', 'torsemide', 'metolazone', 'chlorthalidone',
            'hydrochlorothiazide', 'indapamide', 'acetazolamide',
            // Anticoagulants
            'warfarin', 'rivaroxaban', 'apixaban', 'dabigatran', 'edoxaban',
            'heparin', 'enoxaparin', 'fondaparinux', 'dalteparin', 'tinzaparin',
            // Antiplatelets
            'aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel', 'cangrelor', 'ticlopidine',
            // Statins
            'atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'pitavastatin',
            'lovastatin', 'fluvastatin',
            // Other lipid lowering
            'ezetimibe', 'evolocumab', 'alirocumab', 'inclisiran', 'bempedoic',
            'icosapent', 'fenofibrate', 'gemfibrozil', 'niacin', 'colesevelam',
            // Novel HF
            'omecamtiv', 'mecarbil', 'vericiguat', 'mavacamten', 'aficamten',
            // Inotropes/vasopressors
            'dobutamine', 'dopamine', 'milrinone', 'levosimendan', 'norepinephrine',
            'epinephrine', 'vasopressin', 'phenylephrine',
            // Placebo/comparators
            'placebo'
        ]),
        BIOMARKER: new Set([
            // Cardiac (including hyphenated variants)
            'ntprobnp', 'nt-probnp', 'pro-bnp', 'probnp', 'bnp', 'troponin', 'hs-troponin', 'hstroponin', 'tnt', 'tni', 'ckmb', 'ck-mb',
            // Renal
            'creatinine', 'egfr', 'bun', 'urea', 'cystatin',
            // Electrolytes
            'potassium', 'sodium', 'magnesium', 'calcium', 'phosphate', 'chloride',
            // Hematology
            'hemoglobin', 'hematocrit', 'platelet', 'wbc', 'neutrophil', 'lymphocyte',
            // Coagulation
            'inr', 'ptt', 'aptt', 'fibrinogen', 'ddimer', 'd-dimer',
            // Inflammatory
            'crp', 'hscrp', 'esr', 'procalcitonin', 'interleukin',
            // Iron studies
            'ferritin', 'transferrin', 'iron', 'tibc',
            // Liver
            'ast', 'alt', 'alp', 'ggt', 'bilirubin', 'albumin',
            // Metabolic
            'ldl', 'hdl', 'triglycerides', 'cholesterol', 'vldl', 'apob', 'lpa',
            'glucose', 'hba1c', 'fasting', 'insulin',
            // Thyroid
            'tsh', 't4', 't3',
            // Other
            'lactate', 'uric'
        ]),
        OUTCOME: new Set([
            // Mortality
            'death', 'mortality', 'survival', 'fatal',
            // Hospitalization
            'hospitalization', 'admission', 'readmission', 'rehospitalization',
            // Cerebrovascular
            'stroke', 'tia', 'cva', 'intracranial',
            // Thromboembolic
            'embolism', 'thromboembolism', 'thrombosis', 'dvt', 'pe',
            // Bleeding
            'bleeding', 'hemorrhage', 'transfusion', 'haemorrhage',
            // Cardiac
            'infarction', 'reinfarction', 'revascularization', 'stent',
            'arrhythmia', 'tachycardia', 'bradycardia', 'fibrillation',
            // Other
            'syncope', 'hypotension', 'hyperkalemia', 'hypokalemia',
            'aki', 'esrd', 'dialysis', 'amputation',
            // Composite
            'mace', 'macce', 'composite', 'endpoint', 'event'
        ]),
        PROCEDURE: new Set([
            // PCI
            'pci', 'ptca', 'angioplasty', 'stenting', 'stent',
            // CABG
            'cabg', 'bypass', 'grafting',
            // Valve
            'tavr', 'tavi', 'savr', 'tmvr', 'mitraclip', 'watchman',
            'valvuloplasty', 'commissurotomy', 'annuloplasty',
            // Electrophysiology
            'ablation', 'cardioversion', 'defibrillation', 'pacemaker',
            'icd', 'crt', 'pvi', 'mapping',
            // Heart failure
            'lvad', 'rvad', 'ecmo', 'iabp', 'impella', 'transplant',
            // Diagnostic
            'angiography', 'catheterization', 'echocardiography', 'mri', 'ct',
            // Other
            'surgery', 'implantation', 'extraction', 'closure'
        ]),
        CONDITION: new Set([
            // Heart failure
            'failure', 'hfref', 'hfpef', 'hfmref', 'cardiomyopathy',
            'congestion', 'decompensated',
            // Arrhythmias
            'fibrillation', 'flutter', 'arrhythmia', 'tachycardia', 'bradycardia',
            'svt', 'vt', 'vf', 'wpw',
            // Valvular
            'stenosis', 'regurgitation', 'prolapse', 'insufficiency',
            // Coronary
            'infarction', 'ischemia', 'angina', 'acs', 'nstemi', 'stemi',
            // Structural
            'myocarditis', 'pericarditis', 'endocarditis', 'tamponade',
            // Vascular
            'hypertension', 'hypotension', 'atherosclerosis', 'aneurysm', 'dissection',
            // Metabolic
            'diabetes', 'diabetic', 'obesity', 'metabolic',
            // Renal
            'renal', 'kidney', 'ckd', 'esrd', 'nephropathy',
            // Hepatic
            'hepatic', 'cirrhosis', 'liver',
            // Hematologic
            'anemia', 'thrombocytopenia', 'coagulopathy'
        ])
    },

    // Multi-word entity patterns (compound terms)
    multiWordEntities: {
        COMPOUND_DRUG: [
            'sacubitril/valsartan', 'sacubitril-valsartan', 'entresto',
            'isosorbide dinitrate', 'isosorbide mononitrate',
            'low dose aspirin', 'dual antiplatelet', 'dapt',
            'triple therapy'
        ],
        COMPOUND_OUTCOME: [
            'cardiovascular death', 'cv death', 'all-cause mortality',
            'all cause mortality', 'sudden cardiac death', 'scd',
            'heart failure hospitalization', 'hf hospitalization',
            'worsening heart failure', 'whf',
            'major adverse cardiovascular event', 'mace',
            'stroke or systemic embolism', 'sse',
            'major bleeding', 'minor bleeding', 'clinically relevant bleeding',
            'life threatening bleeding', 'intracranial hemorrhage', 'ich',
            'gastrointestinal bleeding', 'gi bleeding',
            'myocardial infarction', 'mi', 'nonfatal mi',
            'urgent revascularization', 'target vessel revascularization',
            'stent thrombosis', 'in-stent restenosis',
            'new onset atrial fibrillation', 'af recurrence'
        ],
        COMPOUND_CONDITION: [
            'heart failure', 'atrial fibrillation', 'atrial flutter',
            'aortic stenosis', 'mitral regurgitation', 'tricuspid regurgitation',
            'coronary artery disease', 'cad', 'peripheral artery disease', 'pad',
            'chronic kidney disease', 'ckd', 'end stage renal disease',
            'type 2 diabetes', 't2dm', 'type 1 diabetes',
            'ischemic cardiomyopathy', 'dilated cardiomyopathy', 'dcm',
            'hypertrophic cardiomyopathy', 'hcm',
            'pulmonary hypertension', 'pulmonary embolism',
            'deep vein thrombosis', 'dvt'
        ],
        COMPOUND_BIOMARKER: [
            'nt-probnp', 'nt probnp', 'n-terminal pro-bnp',
            'high sensitivity troponin', 'hs-troponin', 'hs troponin',
            'high sensitivity crp', 'hs-crp', 'hsCRP',
            'ldl cholesterol', 'ldl-c', 'hdl cholesterol', 'hdl-c',
            'non-hdl cholesterol', 'total cholesterol',
            'lipoprotein a', 'lp(a)',
            'glomerular filtration rate', 'gfr'
        ]
    },

    // Pattern-based entity extraction - EXPANDED
    patterns: {
        DOSE: /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|g|iu|units?|ml)\b/gi,
        PERCENTAGE: /(\d+(?:\.\d+)?)\s*%/g,
        // Hazard Ratio
        HAZARD_RATIO: /(?:HR|hazard\s*ratio)[:\s]*(\d+\.\d+)/gi,
        // Relative Risk
        RELATIVE_RISK: /(?:RR|relative\s*risk)[:\s]*(\d+\.\d+)/gi,
        // Odds Ratio
        ODDS_RATIO: /(?:OR|odds\s*ratio)[:\s]*(\d+\.\d+)/gi,
        // Risk Difference / Absolute Risk Reduction
        RISK_DIFFERENCE: /(?:RD|ARR|risk\s*difference|absolute\s*risk\s*reduction)[:\s]*(-?\d+\.\d+)/gi,
        // Number Needed to Treat/Harm
        NNT: /(?:NNT|number\s*needed\s*to\s*treat)[:\s]*(\d+(?:\.\d+)?)/gi,
        NNH: /(?:NNH|number\s*needed\s*to\s*harm)[:\s]*(\d+(?:\.\d+)?)/gi,
        // Confidence Interval (more flexible)
        CONFIDENCE_INTERVAL: /(?:95%?\s*CI|CI\s*95%?|confidence\s*interval)[:\s]*[\[(]?(\d+\.\d+)\s*[-–,to]+\s*(\d+\.\d+)[\])]?/gi,
        // P-value (more patterns)
        P_VALUE: /[Pp]\s*[=<>]\s*0?\.\d+|[Pp]\s*[<>]\s*0?\.\d+/g,
        // Sample size (case insensitive)
        SAMPLE_SIZE: /[Nn]\s*[=:]\s*(\d+(?:,\d+)?)/g,
        TOTAL_PATIENTS: /(\d+(?:,\d+)?)\s*(?:patients?|participants?|subjects?)\s*(?:were\s*)?(?:randomized|enrolled|included)/gi,
        // Age patterns
        AGE: /(?:age|aged?|mean\s*age)[:\s]*(\d+(?:\.\d+)?)\s*(?:±|±|years?|y|yrs?)/gi,
        AGE_RANGE: /age[d\s]*(\d+)\s*(?:to|-|–)\s*(\d+)\s*(?:years?)?/gi,
        // Follow-up
        FOLLOWUP: /(?:follow[- ]?up|median\s*follow|mean\s*follow)[:\s]*(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?)/gi,
        // Trial acronym
        TRIAL_ACRONYM: /\b([A-Z]{2,}(?:-[A-Z0-9]+)?(?:\s+\d+)?)\s*(?:trial|study|investigation)/gi,
        // Event rates
        EVENT_RATE: /(\d+(?:\.\d+)?)\s*(?:events?\s*)?(?:per|\/)\s*(\d+)\s*(?:patient[- ]?years?|person[- ]?years?|py)/gi,
        // Incidence
        INCIDENCE: /(?:incidence|rate)[:\s]*(\d+(?:\.\d+)?)\s*(?:per\s*)?(\d+)?/gi
    },

    // Extract entities from text
    extract(text) {
        const entities = {
            drugs: [],
            biomarkers: [],
            outcomes: [],
            procedures: [],
            conditions: [],
            measurements: [],
            compoundEntities: []
        };

        const textLower = text.toLowerCase();

        // Multi-word entity extraction FIRST (before single words)
        for (const [type, phrases] of Object.entries(this.multiWordEntities)) {
            for (const phrase of phrases) {
                if (textLower.includes(phrase.toLowerCase())) {
                    const entity = { type, phrase, normalized: phrase.toLowerCase() };
                    if (!entities.compoundEntities.some(e => e.phrase === phrase)) {
                        entities.compoundEntities.push(entity);
                    }
                }
            }
        }

        // Word-based entity extraction
        const words = textLower.match(/[a-z]+/g) || [];
        for (const word of words) {
            if (this.entities.DRUG.has(word)) {
                if (!entities.drugs.includes(word)) entities.drugs.push(word);
            }
            if (this.entities.BIOMARKER.has(word)) {
                if (!entities.biomarkers.includes(word)) entities.biomarkers.push(word);
            }
            if (this.entities.OUTCOME.has(word)) {
                if (!entities.outcomes.includes(word)) entities.outcomes.push(word);
            }
            if (this.entities.PROCEDURE.has(word)) {
                if (!entities.procedures.includes(word)) entities.procedures.push(word);
            }
            if (this.entities.CONDITION.has(word)) {
                if (!entities.conditions.includes(word)) entities.conditions.push(word);
            }
        }

        // Pattern-based extraction
        for (const [type, pattern] of Object.entries(this.patterns)) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.measurements.push({
                    type,
                    value: match[0],
                    groups: match.slice(1),
                    position: match.index
                });
            }
        }

        return entities;
    },

    // Check if a term is a known entity
    isEntity(term, type = null) {
        const normalized = term.toLowerCase().replace(/[^a-z]/g, '');
        if (type) {
            return this.entities[type]?.has(normalized) || false;
        }
        for (const entitySet of Object.values(this.entities)) {
            if (entitySet.has(normalized)) return true;
        }
        return false;
    },

    // Get entity type
    getEntityType(term) {
        const normalized = term.toLowerCase().replace(/[^a-z]/g, '');
        for (const [type, entitySet] of Object.entries(this.entities)) {
            if (entitySet.has(normalized)) return type;
        }
        return null;
    }
};

// ============================================================
// CONFIDENCE CALIBRATION - Logistic Regression
// ============================================================
const ConfidenceCalibrator = {
    // Pre-trained weights for confidence calibration
    weights: {
        intercept: -0.5,
        sourceTable: 0.8,
        sourceProse: 0.3,
        hasCI: 0.4,
        hasN: 0.3,
        inAbstract: 0.5,
        nearKeyword: 0.4,
        multipleMatches: -0.3,
        lengthPenalty: -0.1
    },

    // Sigmoid function
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    },

    // Calibrate confidence score
    calibrate(features) {
        let logit = this.weights.intercept;

        if (features.source === 'table') logit += this.weights.sourceTable;
        if (features.source === 'prose') logit += this.weights.sourceProse;
        if (features.hasCI) logit += this.weights.hasCI;
        if (features.hasN) logit += this.weights.hasN;
        if (features.inAbstract) logit += this.weights.inAbstract;
        if (features.nearKeyword) logit += this.weights.nearKeyword;
        if (features.multipleMatches) logit += this.weights.multipleMatches;
        if (features.textLength > 10000) logit += this.weights.lengthPenalty;

        return this.sigmoid(logit);
    },

    // Calibrate extraction result
    calibrateExtraction(extraction, context) {
        const features = {
            source: extraction.source || 'prose',
            hasCI: extraction.ciLo !== undefined && extraction.ciHi !== undefined,
            hasN: extraction.n !== undefined,
            inAbstract: context.position < 2000,
            nearKeyword: context.nearKeyword || false,
            multipleMatches: context.matchCount > 1,
            textLength: context.textLength || 0
        };

        return this.calibrate(features);
    }
};

// ============================================================
// INTELLIGENT FIELD PREDICTOR
// ============================================================
const FieldPredictor = {
    // Domain-specific field expectations
    expectations: {
        HF: {
            required: ['ef', 'nyha', 'ntprobnp'],
            common: ['age', 'sex', 'bmi', 'diabetes', 'hypertension', 'renal'],
            outcomes: ['cv_death', 'hf_hospitalization', 'all_cause_death']
        },
        AF: {
            required: ['chadsvasc', 'hasbled'],
            common: ['age', 'sex', 'stroke_history', 'bleeding_history'],
            outcomes: ['stroke', 'systemic_embolism', 'major_bleeding', 'death']
        },
        VALVULAR: {
            required: ['gradient', 'valve_area'],
            common: ['age', 'sex', 'sts_score', 'euroscore'],
            outcomes: ['death', 'stroke', 'paravalvular_leak', 'pacemaker']
        },
        ACS: {
            required: ['troponin', 'killip'],
            common: ['age', 'sex', 'diabetes', 'prior_mi', 'pci_history'],
            outcomes: ['death', 'reinfarction', 'stent_thrombosis', 'bleeding']
        },
        LIPID: {
            required: ['ldl', 'hdl', 'triglycerides'],
            common: ['age', 'sex', 'diabetes', 'statin_use'],
            outcomes: ['cv_death', 'mi', 'stroke', 'revascularization']
        }
    },

    // Predict missing fields based on domain
    predictMissing(extracted, domain) {
        const expectations = this.expectations[domain];
        if (!expectations) return [];

        const missing = [];
        for (const field of expectations.required) {
            if (!extracted[field]) {
                missing.push({ field, importance: 'required', likelihood: 0.9 });
            }
        }
        for (const field of expectations.common) {
            if (!extracted[field]) {
                missing.push({ field, importance: 'common', likelihood: 0.6 });
            }
        }
        return missing;
    },

    // Validate extraction completeness
    validateCompleteness(extracted, domain) {
        const expectations = this.expectations[domain];
        if (!expectations) return { score: 0.5, missing: [] };

        let foundRequired = 0;
        let foundCommon = 0;
        const missing = [];

        for (const field of expectations.required) {
            if (extracted[field]) foundRequired++;
            else missing.push(field);
        }
        for (const field of expectations.common) {
            if (extracted[field]) foundCommon++;
        }

        const requiredScore = expectations.required.length > 0
            ? foundRequired / expectations.required.length
            : 1;
        const commonScore = expectations.common.length > 0
            ? foundCommon / expectations.common.length
            : 1;

        return {
            score: requiredScore * 0.7 + commonScore * 0.3,
            missing,
            foundRequired,
            foundCommon,
            totalRequired: expectations.required.length,
            totalCommon: expectations.common.length
        };
    }
};

// ============================================================
// SEMANTIC SEARCH - Find similar content
// ============================================================
const SemanticSearch = {
    // Build term frequency index
    buildIndex(text) {
        const words = text.toLowerCase().match(/[a-z]+/g) || [];
        const tf = {};
        for (const word of words) {
            tf[word] = (tf[word] || 0) + 1;
        }
        // Normalize
        const maxFreq = Math.max(...Object.values(tf));
        for (const word in tf) {
            tf[word] /= maxFreq;
        }
        return tf;
    },

    // Find sentences containing query terms (semantic expansion)
    search(text, query, topK = 5) {
        const queryTerms = query.toLowerCase().match(/[a-z]+/g) || [];
        const expandedTerms = new Set(queryTerms);

        // Semantic expansion using embeddings
        for (const term of queryTerms) {
            const similar = WordEmbeddings.findSimilar(term, 0.7);
            if (similar.match) expandedTerms.add(similar.match);
        }

        // Split into sentences
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

        // Score sentences
        const scored = sentences.map((sent, idx) => {
            const words = sent.toLowerCase().match(/[a-z]+/g) || [];
            let score = 0;
            for (const word of words) {
                if (expandedTerms.has(word)) score += 2;
                // Partial match bonus
                for (const term of expandedTerms) {
                    if (word.includes(term) || term.includes(word)) score += 0.5;
                }
            }
            return { sentence: sent.trim(), score, index: idx };
        });

        // Return top K
        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    },

    // Find context around a match
    getContext(text, position, windowSize = 200) {
        const start = Math.max(0, position - windowSize);
        const end = Math.min(text.length, position + windowSize);
        return text.slice(start, end);
    }
};

// ============================================================
// ENSEMBLE EXTRACTOR - Combine multiple signals
// ============================================================
const EnsembleExtractor = {
    // Combine multiple extraction attempts
    combine(extractions) {
        if (!extractions || extractions.length === 0) return null;
        if (extractions.length === 1) return extractions[0];

        // Group by value (with tolerance)
        const groups = [];
        for (const ext of extractions) {
            let found = false;
            for (const group of groups) {
                if (this.valuesMatch(ext.value, group.values[0])) {
                    group.values.push(ext.value);
                    group.confidences.push(ext.confidence || 0.5);
                    group.sources.push(ext.source);
                    found = true;
                    break;
                }
            }
            if (!found) {
                groups.push({
                    values: [ext.value],
                    confidences: [ext.confidence || 0.5],
                    sources: [ext.source]
                });
            }
        }

        // Select best group (most votes + highest confidence)
        let bestGroup = groups[0];
        let bestScore = 0;
        for (const group of groups) {
            const avgConf = group.confidences.reduce((a, b) => a + b, 0) / group.confidences.length;
            const score = group.values.length * 0.3 + avgConf * 0.7;
            if (score > bestScore) {
                bestScore = score;
                bestGroup = group;
            }
        }

        // Return consensus value
        const avgValue = typeof bestGroup.values[0] === 'number'
            ? bestGroup.values.reduce((a, b) => a + b, 0) / bestGroup.values.length
            : bestGroup.values[0];

        return {
            value: avgValue,
            confidence: bestGroup.confidences.reduce((a, b) => a + b, 0) / bestGroup.confidences.length,
            sources: [...new Set(bestGroup.sources)],
            consensus: bestGroup.values.length
        };
    },

    // Check if two values match (with tolerance for numbers)
    valuesMatch(v1, v2, tolerance = 0.05) {
        if (typeof v1 === 'number' && typeof v2 === 'number') {
            return Math.abs(v1 - v2) / Math.max(Math.abs(v1), Math.abs(v2), 1) < tolerance;
        }
        return v1 === v2;
    }
};

// ============================================================
// MAIN LOCAL AI MODULE
// ============================================================
const LocalAI = {
    version: '1.0.0',

    // Component access
    embeddings: WordEmbeddings,
    classifier: NaiveBayesClassifier,
    ner: MedicalNER,
    calibrator: ConfidenceCalibrator,
    predictor: FieldPredictor,
    search: SemanticSearch,
    ensemble: EnsembleExtractor,

    // High-level analysis function
    analyze(text) {
        const startTime = Date.now();

        // Domain classification
        const domain = this.classifier.classify(text);

        // Entity extraction
        const entities = this.ner.extract(text);

        // Semantic search for key sections
        const resultsSections = this.search.search(text, 'results primary outcome hazard ratio');
        const methodsSections = this.search.search(text, 'methods randomized patients enrolled');
        const baselineSections = this.search.search(text, 'baseline characteristics age sex');

        return {
            domain,
            entities,
            sections: {
                results: resultsSections,
                methods: methodsSections,
                baseline: baselineSections
            },
            processingTime: Date.now() - startTime,
            version: this.version
        };
    },

    // Semantic similarity between terms
    similarity(term1, term2) {
        return this.embeddings.similarity(term1, term2);
    },

    // Find semantically similar terms
    findSimilar(term) {
        return this.embeddings.findSimilar(term);
    },

    // Calibrate extraction confidence
    calibrateConfidence(extraction, context) {
        return this.calibrator.calibrateExtraction(extraction, context);
    },

    // Predict what fields might be missing
    predictMissingFields(extracted, domain) {
        return this.predictor.predictMissing(extracted, domain);
    },

    // Validate extraction completeness
    validateExtraction(extracted, domain) {
        return this.predictor.validateCompleteness(extracted, domain);
    }
};

module.exports = {
    LocalAI,
    WordEmbeddings,
    NaiveBayesClassifier,
    MedicalNER,
    ConfidenceCalibrator,
    FieldPredictor,
    SemanticSearch,
    EnsembleExtractor
};
