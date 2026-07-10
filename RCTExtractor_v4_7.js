// RCTExtractor_v4_7.js -- base RCT extraction engine.
//
// RECOVERED 2026-06-07. The original v4_7 was never committed to this repo, so
// RCTExtractor_v4_8_AI.js (which delegates base extract/flatten/getSummary to it)
// could not load and the whole package was non-functional. This file is lifted
// verbatim from the version-matched RCTExtractor_WebApp.html browser bundle
// (version 5.1.0 == v4_8's base version), lines 681-1689: the base extractor and
// its helpers (WordEmbeddings, NaiveBayesClassifier, MedicalNER, RCTExtractor,
// CorruptionDetector, ValidationGates), with the DOM/UI code excluded. The only
// added code is the module.exports footer and the dot-path `flatten` method that
// v4_8 consumes (the WebApp UI never needed flatten, so it was browser-absent).
'use strict';

// ============================================================
// EMBEDDED LocalAI MODULE (Minified core functions)
// ============================================================

const WordEmbeddings = {
    vectors: {
        // Cardiovascular core
        heart: [0.9,0.8,0.1,0.2,0.7,0.6,0.3,0.4,0.8,0.5,0.2,0.1,0.6,0.7,0.4,0.3,0.5,0.8,0.2,0.1],
        cardiac: [0.88,0.82,0.12,0.18,0.72,0.58,0.28,0.42,0.78,0.52,0.22,0.08,0.62,0.68,0.38,0.32,0.48,0.82,0.18,0.12],
        failure: [0.7,0.6,0.3,0.4,0.8,0.5,0.2,0.3,0.7,0.6,0.4,0.2,0.5,0.6,0.3,0.4,0.6,0.7,0.3,0.2],
        hfref: [0.85,0.75,0.15,0.25,0.82,0.55,0.25,0.35,0.75,0.58,0.28,0.15,0.58,0.65,0.35,0.38,0.55,0.78,0.22,0.15],
        hfpef: [0.82,0.72,0.18,0.28,0.78,0.52,0.28,0.38,0.72,0.55,0.32,0.18,0.55,0.62,0.38,0.42,0.52,0.75,0.25,0.18],
        ejection: [0.75,0.7,0.2,0.3,0.85,0.5,0.25,0.35,0.7,0.55,0.3,0.15,0.55,0.65,0.35,0.4,0.5,0.75,0.25,0.2],
        fraction: [0.72,0.68,0.22,0.32,0.82,0.48,0.28,0.38,0.68,0.52,0.32,0.18,0.52,0.62,0.38,0.42,0.48,0.72,0.28,0.22],
        lvef: [0.78,0.72,0.18,0.28,0.88,0.52,0.22,0.32,0.72,0.58,0.28,0.12,0.58,0.68,0.32,0.38,0.52,0.78,0.22,0.18],

        // Atrial fibrillation
        atrial: [0.6,0.5,0.7,0.3,0.4,0.8,0.2,0.5,0.6,0.4,0.7,0.3,0.5,0.4,0.6,0.3,0.7,0.5,0.4,0.6],
        fibrillation: [0.58,0.52,0.72,0.28,0.42,0.78,0.22,0.48,0.58,0.42,0.68,0.32,0.48,0.42,0.58,0.32,0.68,0.52,0.42,0.58],
        afib: [0.62,0.48,0.75,0.32,0.38,0.82,0.18,0.52,0.62,0.38,0.72,0.28,0.52,0.38,0.62,0.28,0.72,0.48,0.38,0.62],
        stroke: [0.5,0.4,0.8,0.2,0.3,0.7,0.3,0.6,0.5,0.3,0.75,0.25,0.4,0.35,0.65,0.25,0.75,0.45,0.35,0.55],
        anticoagulation: [0.55,0.45,0.78,0.25,0.35,0.75,0.25,0.55,0.55,0.35,0.72,0.28,0.45,0.38,0.62,0.28,0.72,0.48,0.38,0.58],
        warfarin: [0.52,0.42,0.82,0.22,0.32,0.78,0.22,0.58,0.52,0.32,0.75,0.25,0.42,0.35,0.65,0.25,0.75,0.45,0.35,0.55],

        // SGLT2 inhibitors
        dapagliflozin: [0.3,0.4,0.2,0.8,0.5,0.3,0.7,0.2,0.4,0.6,0.3,0.7,0.4,0.5,0.3,0.6,0.2,0.4,0.7,0.5],
        empagliflozin: [0.32,0.38,0.22,0.78,0.52,0.32,0.68,0.22,0.42,0.58,0.32,0.68,0.42,0.48,0.32,0.58,0.22,0.42,0.68,0.52],
        canagliflozin: [0.28,0.42,0.18,0.82,0.48,0.28,0.72,0.18,0.38,0.62,0.28,0.72,0.38,0.52,0.28,0.62,0.18,0.38,0.72,0.48],
        sotagliflozin: [0.35,0.35,0.25,0.75,0.55,0.35,0.65,0.25,0.45,0.55,0.35,0.65,0.45,0.45,0.35,0.55,0.25,0.45,0.65,0.55],
        sglt2: [0.3,0.4,0.2,0.85,0.5,0.3,0.75,0.2,0.4,0.6,0.3,0.75,0.4,0.5,0.3,0.6,0.2,0.4,0.75,0.5],

        // Outcomes
        death: [0.2,0.3,0.4,0.5,0.6,0.4,0.5,0.7,0.3,0.4,0.5,0.6,0.7,0.3,0.4,0.5,0.6,0.3,0.5,0.4],
        mortality: [0.22,0.28,0.42,0.48,0.58,0.42,0.48,0.68,0.32,0.42,0.48,0.58,0.68,0.32,0.42,0.48,0.58,0.32,0.48,0.42],
        hospitalization: [0.4,0.5,0.3,0.6,0.7,0.5,0.4,0.6,0.5,0.5,0.4,0.5,0.6,0.4,0.5,0.4,0.5,0.4,0.4,0.5],

        // Biomarkers
        troponin: [0.4,0.5,0.3,0.6,0.5,0.6,0.4,0.5,0.6,0.7,0.4,0.5,0.3,0.6,0.5,0.4,0.6,0.5,0.4,0.3],
        bnp: [0.42,0.48,0.32,0.58,0.52,0.58,0.42,0.52,0.58,0.68,0.42,0.52,0.32,0.58,0.52,0.42,0.58,0.52,0.42,0.32],
        ntprobnp: [0.45,0.45,0.35,0.55,0.55,0.55,0.45,0.55,0.55,0.65,0.45,0.55,0.35,0.55,0.55,0.45,0.55,0.55,0.45,0.35],
        creatinine: [0.35,0.55,0.25,0.65,0.45,0.65,0.35,0.45,0.65,0.55,0.35,0.45,0.45,0.55,0.45,0.55,0.55,0.45,0.55,0.45],
        egfr: [0.38,0.52,0.28,0.62,0.48,0.62,0.38,0.48,0.62,0.58,0.38,0.48,0.42,0.58,0.48,0.52,0.58,0.48,0.52,0.42],

        // Statistical
        hazard: [0.15,0.25,0.35,0.45,0.35,0.25,0.55,0.45,0.25,0.35,0.65,0.55,0.45,0.25,0.35,0.65,0.45,0.25,0.55,0.65],
        ratio: [0.18,0.22,0.38,0.42,0.38,0.28,0.52,0.48,0.28,0.38,0.62,0.58,0.48,0.28,0.38,0.62,0.48,0.28,0.52,0.62],
        confidence: [0.12,0.28,0.32,0.48,0.32,0.22,0.58,0.42,0.22,0.32,0.68,0.52,0.42,0.22,0.32,0.68,0.42,0.22,0.58,0.68],
        interval: [0.14,0.26,0.34,0.46,0.34,0.24,0.56,0.44,0.24,0.34,0.66,0.54,0.44,0.24,0.34,0.66,0.44,0.24,0.56,0.66],
        pvalue: [0.1,0.3,0.3,0.5,0.3,0.2,0.6,0.4,0.2,0.3,0.7,0.5,0.4,0.2,0.3,0.7,0.4,0.2,0.6,0.7],

        // Procedures
        pci: [0.5,0.6,0.5,0.4,0.3,0.7,0.3,0.4,0.5,0.4,0.5,0.4,0.4,0.6,0.5,0.3,0.4,0.6,0.3,0.4],
        cabg: [0.48,0.58,0.52,0.42,0.32,0.68,0.32,0.42,0.48,0.42,0.48,0.42,0.42,0.58,0.48,0.32,0.42,0.58,0.32,0.42],
        ablation: [0.55,0.5,0.6,0.35,0.35,0.65,0.35,0.45,0.55,0.35,0.55,0.35,0.45,0.55,0.55,0.35,0.45,0.55,0.35,0.45],

        // Valvular
        aortic: [0.6,0.55,0.45,0.35,0.5,0.5,0.4,0.5,0.55,0.45,0.4,0.45,0.5,0.5,0.45,0.45,0.4,0.55,0.45,0.4],
        stenosis: [0.58,0.52,0.48,0.38,0.48,0.52,0.42,0.48,0.52,0.48,0.42,0.42,0.48,0.52,0.48,0.42,0.42,0.52,0.42,0.42],
        tavr: [0.62,0.48,0.52,0.32,0.52,0.48,0.38,0.52,0.58,0.42,0.38,0.48,0.52,0.48,0.42,0.48,0.38,0.58,0.48,0.38],
        valve: [0.55,0.5,0.5,0.4,0.45,0.55,0.45,0.45,0.5,0.5,0.45,0.4,0.45,0.55,0.5,0.4,0.45,0.5,0.4,0.45],

        // ACS
        infarction: [0.45,0.55,0.55,0.45,0.4,0.6,0.35,0.55,0.5,0.45,0.5,0.5,0.55,0.45,0.5,0.45,0.5,0.5,0.45,0.5],
        myocardial: [0.48,0.52,0.52,0.48,0.42,0.58,0.38,0.52,0.52,0.48,0.48,0.48,0.52,0.48,0.52,0.42,0.48,0.52,0.42,0.48],
        stent: [0.5,0.55,0.5,0.4,0.35,0.65,0.35,0.5,0.55,0.4,0.45,0.45,0.5,0.55,0.5,0.35,0.45,0.55,0.35,0.45],
        coronary: [0.52,0.58,0.48,0.42,0.38,0.62,0.38,0.48,0.58,0.42,0.42,0.48,0.52,0.52,0.48,0.38,0.48,0.58,0.38,0.42],

        // Lipid
        cholesterol: [0.35,0.45,0.4,0.55,0.45,0.45,0.5,0.4,0.45,0.55,0.45,0.45,0.4,0.45,0.45,0.55,0.45,0.45,0.5,0.55],
        ldl: [0.38,0.42,0.42,0.52,0.48,0.42,0.52,0.42,0.48,0.52,0.48,0.48,0.42,0.48,0.48,0.52,0.48,0.48,0.52,0.52],
        statin: [0.32,0.48,0.38,0.58,0.42,0.48,0.48,0.38,0.42,0.58,0.42,0.42,0.38,0.42,0.42,0.58,0.42,0.42,0.48,0.58],
        pcsk9: [0.3,0.5,0.35,0.6,0.4,0.5,0.45,0.35,0.4,0.6,0.4,0.4,0.35,0.4,0.4,0.6,0.4,0.4,0.45,0.6],

        // Common terms
        placebo: [0.25,0.35,0.35,0.55,0.45,0.35,0.55,0.45,0.35,0.45,0.45,0.55,0.55,0.35,0.45,0.45,0.55,0.35,0.45,0.55],
        randomized: [0.2,0.3,0.4,0.5,0.4,0.3,0.6,0.5,0.3,0.4,0.5,0.6,0.6,0.3,0.4,0.5,0.6,0.3,0.5,0.6],
        trial: [0.22,0.32,0.38,0.52,0.42,0.32,0.58,0.48,0.32,0.42,0.52,0.58,0.58,0.32,0.42,0.52,0.58,0.32,0.52,0.58],
        patients: [0.3,0.4,0.35,0.55,0.5,0.4,0.5,0.45,0.4,0.5,0.45,0.5,0.55,0.4,0.45,0.45,0.5,0.4,0.45,0.5],
        treatment: [0.28,0.38,0.38,0.52,0.48,0.38,0.52,0.48,0.38,0.48,0.48,0.52,0.52,0.38,0.48,0.48,0.52,0.38,0.48,0.52]
    },

    similarity(term1, term2) {
        const v1 = this.vectors[term1.toLowerCase()];
        const v2 = this.vectors[term2.toLowerCase()];
        if (!v1 || !v2) return 0.3;
        let dot = 0, mag1 = 0, mag2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            mag1 += v1[i] * v1[i];
            mag2 += v2[i] * v2[i];
        }
        return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
    }
};

const NaiveBayesClassifier = {
    domainKeywords: {
        HF: ['heart failure', 'ejection fraction', 'lvef', 'nyha', 'hfref', 'hfpef', 'hospitalization for heart failure', 'worsening heart failure', 'nt-probnp', 'bnp', 'cardiomyopathy', 'reduced ef', 'preserved ef'],
        AF: ['atrial fibrillation', 'afib', 'stroke', 'systemic embolism', 'anticoagulation', 'warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'chads', 'bleeding', 'tte', 'cardioversion'],
        VALVULAR: ['aortic stenosis', 'valve', 'tavr', 'tavi', 'surgical', 'transcatheter', 'regurgitation', 'mitral', 'gradient', 'prosthetic'],
        ACS: ['myocardial infarction', 'acute coronary', 'stemi', 'nstemi', 'troponin', 'pci', 'stent', 'thrombolysis', 'acs', 'angina', 'coronary artery disease'],
        LIPID: ['ldl', 'cholesterol', 'statin', 'pcsk9', 'lipid', 'atherosclerosis', 'cardiovascular risk', 'triglyceride', 'hdl', 'apolipoprotein']
    },

    classify(text) {
        const textLower = text.toLowerCase();
        const scores = {};
        let maxScore = 0;
        let bestDomain = 'HF';

        for (const [domain, keywords] of Object.entries(this.domainKeywords)) {
            let score = 0;
            for (const keyword of keywords) {
                const regex = new RegExp(keyword.replace(/\s+/g, '\\s+'), 'gi');
                const matches = textLower.match(regex);
                if (matches) {
                    score += matches.length * (keyword.includes(' ') ? 2 : 1);
                }
            }
            scores[domain] = score;
            if (score > maxScore) {
                maxScore = score;
                bestDomain = domain;
            }
        }

        const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
        const probabilities = {};
        for (const [domain, score] of Object.entries(scores)) {
            probabilities[domain] = score / total;
        }

        return {
            domain: bestDomain,
            confidence: maxScore > 0 ? Math.min(0.99, 0.5 + (maxScore / (total * 2))) : 0.5,
            probabilities
        };
    }
};

const MedicalNER = {
    entities: {
        DRUG: new Set(['dapagliflozin', 'empagliflozin', 'canagliflozin', 'sotagliflozin', 'ertugliflozin',
            'sacubitril', 'valsartan', 'enalapril', 'lisinopril', 'ramipril', 'losartan', 'candesartan',
            'metoprolol', 'carvedilol', 'bisoprolol', 'nebivolol', 'atenolol',
            'spironolactone', 'eplerenone', 'finerenone',
            'furosemide', 'bumetanide', 'torsemide', 'hydrochlorothiazide',
            'digoxin', 'ivabradine', 'hydralazine', 'isosorbide', 'nitrate',
            'warfarin', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'heparin', 'enoxaparin',
            'aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel', 'dipyridamole',
            'atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'pitavastatin',
            'evolocumab', 'alirocumab', 'inclisiran', 'ezetimibe', 'bempedoic',
            'amiodarone', 'sotalol', 'flecainide', 'dronedarone', 'propafenone', 'dofetilide',
            'verapamil', 'diltiazem', 'amlodipine', 'nifedipine',
            'dobutamine', 'milrinone', 'levosimendan',
            'placebo']),
        BIOMARKER: new Set(['troponin', 'bnp', 'nt-probnp', 'ntprobnp', 'pro-bnp', 'creatinine', 'egfr', 'gfr',
            'hemoglobin', 'hematocrit', 'potassium', 'sodium', 'magnesium', 'calcium',
            'ldl', 'hdl', 'triglycerides', 'cholesterol', 'apob', 'lpa',
            'inr', 'd-dimer', 'fibrinogen', 'pt', 'aptt',
            'crp', 'il-6', 'tnf', 'galectin', 'st2', 'gdf-15',
            'hba1c', 'glucose', 'insulin',
            'lvef', 'ejection fraction', 'ef%', 'lvedv', 'lvesv', 'lvidd']),
        OUTCOME: new Set(['death', 'mortality', 'hospitalization', 'stroke', 'embolism', 'bleeding',
            'infarction', 'heart failure', 'cardiovascular', 'all-cause', 'worsening',
            'revascularization', 'stent thrombosis', 'major adverse', 'mace']),
        PROCEDURE: new Set(['pci', 'cabg', 'ablation', 'cardioversion', 'icd', 'crt', 'pacemaker',
            'tavr', 'tavi', 'surgery', 'transplant', 'lvad', 'ecmo', 'dialysis', 'catheterization'])
    },

    extract(text) {
        const found = { drugs: [], biomarkers: [], outcomes: [], procedures: [], measurements: [] };
        const textLower = text.toLowerCase();

        for (const drug of this.entities.DRUG) {
            if (textLower.includes(drug)) found.drugs.push(drug);
        }
        for (const bio of this.entities.BIOMARKER) {
            if (textLower.includes(bio)) found.biomarkers.push(bio);
        }
        for (const out of this.entities.OUTCOME) {
            if (textLower.includes(out)) found.outcomes.push(out);
        }
        for (const proc of this.entities.PROCEDURE) {
            if (textLower.includes(proc)) found.procedures.push(proc);
        }

        // Extract measurements
        const measPatterns = [
            /(\d+\.?\d*)\s*(?:mg|mcg|µg|g|ml|L|mmol|ng|pg)/gi,
            /(\d+\.?\d*)\s*%/g,
            /(\d+\.?\d*)\s*(?:years?|months?|weeks?|days?)/gi
        ];
        for (const pattern of measPatterns) {
            const matches = text.match(pattern);
            if (matches) found.measurements.push(...matches);
        }

        return found;
    }
};

// ============================================================
// MAIN EXTRACTOR
// ============================================================

const RCTExtractor = {
    version: '5.1.0',

    extract(text) {
        const startTime = Date.now();
        const result = {
            study: {},
            design: {},
            population: {},
            treatment: {},
            control: {},
            baseline: {},
            primary: {},
            secondary: {},
            contrast: {},
            safety: {},
            aiEntities: {},
            effectMeasures: {},
            _meta: {}
        };

        // Domain classification
        const mlDomain = NaiveBayesClassifier.classify(text);

        // Entity extraction
        const entities = MedicalNER.extract(text);
        result.aiEntities = entities;

        // Study identification patterns
        const acronymPatterns = [
            /\b([A-Z]{2,}[-\s]?[A-Z0-9]*(?:[-\s][A-Z0-9]+)*)\s+(?:trial|study)/gi,
            /(?:the|in)\s+([A-Z]{2,}[-\s]?[A-Z0-9]*)\s+(?:trial|study|investigators)/gi
        ];

        for (const pattern of acronymPatterns) {
            const match = pattern.exec(text);
            if (match) {
                result.study.acronym = match[1].trim();
                break;
            }
        }

        // Sample size extraction
        const samplePatterns = [
            /(?:randomized?|enrolled?|included?)\s+(\d{2,5})\s+(?:patients?|participants?|subjects?)/gi,
            /(?:n\s*=\s*)(\d{2,5})/gi,
            /(\d{2,5})\s+(?:patients?|participants?)\s+(?:were\s+)?(?:randomized?|enrolled?)/gi
        ];

        for (const pattern of samplePatterns) {
            const match = pattern.exec(text);
            if (match) {
                result.population.total = parseInt(match[1]);
                break;
            }
        }

        // Treatment/control arm extraction - Enhanced v5.2.0
        // Format 1: drug (n=X) or placebo (n=Y)
        const nFormatMatch = text.match(/(?:randomized?|assigned|allocated)\s+to\s+(?:receive\s+)?(\w+(?:[- ]\w+)?)[^()]*\(n\s*[=:]\s*(\d[\d,]*)\)[^()]*(?:or\s+)?(?:placebo|control)\s*\(n\s*[=:]\s*(\d[\d,]*)\)/i);
        if (nFormatMatch) {
            result.treatment.n = parseInt(nFormatMatch[2].replace(/,/g, ''));
            result.control.n = parseInt(nFormatMatch[3].replace(/,/g, ''));
        }

        // Format 2: X patients received drug, Y received placebo
        if (!result.treatment.n || !result.control.n) {
            const receivedMatch = text.match(/(\d[\d,]*)\s+(?:patients?\s+)?received\s+(\w+(?:[–-]\w+)?)[^,]*,\s*(\d[\d,]*)\s+(?:patients?\s+)?received\s+(\w+(?:[–-]\w+)?)/i);
            if (receivedMatch) {
                const n1 = parseInt(receivedMatch[1].replace(/,/g, ''));
                const n2 = parseInt(receivedMatch[3].replace(/,/g, ''));
                const drug2 = receivedMatch[4].toLowerCase();
                const isControl = /placebo|enalapril|warfarin|usual|care|standard|control|sham/i.test(drug2);
                if (isControl) {
                    if (!result.treatment.n) result.treatment.n = n1;
                    if (!result.control.n) result.control.n = n2;
                } else {
                    if (!result.treatment.n) result.treatment.n = n1;
                    if (!result.control.n) result.control.n = n2;
                }
            }
        }

        // Format 3: drug group (X patients) vs placebo group (Y patients)
        if (!result.treatment.n || !result.control.n) {
            const groupMatch = text.match(/(\w+)\s+group\s*\((\d[\d,]*)\s*patients?\)[^()]*(?:vs\.?|versus|and)\s*(\w+)\s+group\s*\((\d[\d,]*)\s*patients?\)/i);
            if (groupMatch) {
                const n1 = parseInt(groupMatch[2].replace(/,/g, ''));
                const n2 = parseInt(groupMatch[4].replace(/,/g, ''));
                const group2 = groupMatch[3].toLowerCase();
                if (/placebo|control|usual|standard|sham/i.test(group2)) {
                    if (!result.treatment.n) result.treatment.n = n1;
                    if (!result.control.n) result.control.n = n2;
                } else {
                    if (!result.treatment.n) result.treatment.n = n1;
                    if (!result.control.n) result.control.n = n2;
                }
            }
        }

        // Format 4: Legacy patterns (fallback)
        if (!result.treatment.n) {
            const armPattern = /(?:treatment|intervention|active)\s+(?:group|arm)?\s*\(?n\s*=\s*(\d+)/gi;
            const armMatch = armPattern.exec(text);
            if (armMatch) result.treatment.n = parseInt(armMatch[1]);
        }

        if (!result.control.n) {
            const controlPattern = /(?:control|placebo|comparator)\s+(?:group|arm)?\s*\(?n\s*=\s*(\d+)/gi;
            const controlMatch = controlPattern.exec(text);
            if (controlMatch) result.control.n = parseInt(controlMatch[1]);
        }

        // Age extraction
        const agePattern = /(?:mean|median)?\s*age[:\s]*(\d+\.?\d*)\s*(?:±|\+\/-|years)/gi;
        const ageMatch = agePattern.exec(text);
        if (ageMatch) {
            result.baseline.age = { mean: parseFloat(ageMatch[1]) };
        }

        // Registration/NCT extraction
        const nctPatterns = [
            /NCT\d{8}/gi,
            /ISRCTN\d+/gi,
            /ACTRN\d+/gi,
            /ChiCTR[\w-]+/gi,
            /UMIN\d+/gi,
            /CTRI\/\d+\/\d+\/\d+/gi,
            /EUCTR\d+-\d+-\d+/gi,
            /KCT\d+/gi
        ];

        result.prisma = { registrationNumber: null, registrationRegistry: null };

        for (const pattern of nctPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.prisma.registrationNumber = match[0];
                // Determine registry
                if (match[0].startsWith('NCT')) result.prisma.registrationRegistry = 'ClinicalTrials.gov';
                else if (match[0].startsWith('ISRCTN')) result.prisma.registrationRegistry = 'ISRCTN';
                else if (match[0].startsWith('ACTRN')) result.prisma.registrationRegistry = 'ANZCTR';
                else if (match[0].startsWith('ChiCTR')) result.prisma.registrationRegistry = 'ChiCTR';
                else if (match[0].startsWith('UMIN')) result.prisma.registrationRegistry = 'UMIN-CTR';
                else if (match[0].startsWith('CTRI')) result.prisma.registrationRegistry = 'CTRI India';
                else if (match[0].startsWith('EUCTR')) result.prisma.registrationRegistry = 'EU Clinical Trials';
                else if (match[0].startsWith('KCT')) result.prisma.registrationRegistry = 'KCTR Korea';
                break;
            }
        }

        // Effect measures extraction
        result.effectMeasures = this.extractEffectMeasures(text);

        // Primary outcome effect (check HR, RR, OR, MD, SMD in order)
        const effectArrays = [
            result.effectMeasures.hazardRatios,
            result.effectMeasures.relativeRisks,
            result.effectMeasures.oddsRatios,
            result.effectMeasures.meanDifferences,
            result.effectMeasures.standardizedMeanDifferences,
            result.effectMeasures.rateRatios
        ];

        for (const arr of effectArrays) {
            if (arr && arr.length > 0) {
                const primary = arr.find(e => e.isPrimary) || arr[0];
                result.contrast.effect = primary.value;
                result.contrast.effectType = primary.type;
                result.contrast.ciLo = primary.ciLo;
                result.contrast.ciHi = primary.ciHi;
                break;
            }
        }

        // P-value extraction
        const pPattern = /[pP]\s*[<>=]\s*(\d*\.?\d+)/g;
        const pMatch = pPattern.exec(text);
        if (pMatch) {
            result.contrast.pValue = parseFloat(pMatch[1]);
        }

        // Quality scoring
        const quality = this.scoreQuality(result, text);

        // Bias assessment
        const bias = this.assessBias(result, text);

        // Metadata
        result._meta = {
            version: this.version,
            extractionTime: Date.now() - startTime,
            domain: mlDomain.domain,
            domainConfidence: mlDomain.confidence,
            domainProbabilities: mlDomain.probabilities,
            qualityScore: quality,
            biasAssessment: bias
        };

        return result;
    },

    extractEffectMeasures(text) {
        const measures = {
            hazardRatios: [],
            relativeRisks: [],
            oddsRatios: [],
            meanDifferences: [],
            standardizedMeanDifferences: [],
            riskDifferences: [],
            rateRatios: [],
            numberNeededToTreat: [],
            numberNeededToHarm: [],
            pValues: [],
            sampleSizes: [],
            followUpDurations: [],
            eventRates: []
        };

        const patterns = {
            HR: [
                // Flexible HR pattern for NEJM format: handles "hazard ratio in the X group, 0.79; 95% CI..."
                /(?:HR|hazard\s*ratio)(?:\s+(?:with|for|in|of)(?:\s+the)?(?:\s+[\w-]+)+)?[,;:\s]+(-?\d+\.?\d*)\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)(?:\s*\[CI\])?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)/gi,
                // NEW: Square bracket CI format: "HR 0.79 [0.65-0.95]" or "HR 0.79 [95% CI 0.65-0.95]"
                /(?:HR|hazard\s*ratio)[,;:\s=]*(-?\d+\.?\d*)\s*\[(?:95%?\s*(?:CI)?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)\]/gi,
                // Simple HR value: "HR 0.80" or "hazard ratio, 0.79"
                /(?:HR|hazard\s*ratio)[,;:\s=]+(-?\d+\.?\d*)/gi,
                // "hazard ratio of/was/= X"
                /(?:hazard\s+ratio\s+(?:of|was|=))\s*(-?\d+\.?\d*)/gi
            ],
            RR: [
                // Flexible RR pattern: handles "relative risk with dabigatran" or "in the X group"
                /(?:RR|relative\s*risk)(?:\s+(?:with|for|in|of)(?:\s+the)?(?:\s+[\w-]+)+)?[,;:\s]+(-?\d+\.?\d*)\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)(?:\s*\[CI\])?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)/gi,
                // NEW: Square bracket CI format: "RR 0.79 [0.65-0.95]"
                /(?:RR|relative\s*risk)[,;:\s=]*(-?\d+\.?\d*)\s*\[(?:95%?\s*(?:CI)?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)\]/gi,
                /(?:RR|relative\s*risk)\s+(?:was|of|=)\s*(-?\d+\.?\d*)/gi,
                /(?:relative\s*risk)[,;:\s=]+(-?\d+\.?\d*)/gi,
                // NEW: "risk ratio X.XX" separate from "relative risk"
                /risk\s+ratio[,;:\s=]+(-?\d+\.?\d*)\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)?[,;:\s]*)?(-?\d+\.?\d*)?\s*(?:[-–]|\s+to\s+|,)?\s*(-?\d+\.?\d*)?/gi,
                // NEW: Risk ratio with square brackets
                /risk\s+ratio[,;:\s=]*(-?\d+\.?\d*)\s*\[(?:95%?\s*(?:CI)?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)\]/gi
            ],
            OR: [
                // Flexible OR pattern: handles "odds ratio with X" or "in the X group"
                /(?:OR|odds\s*ratio)(?:\s+(?:with|for|in|of)(?:\s+the)?(?:\s+[\w-]+)+)?[,;:\s]+(-?\d+\.?\d*)\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)(?:\s*\[CI\])?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)/gi,
                // NEW: Square bracket CI format: "OR 1.25 [0.95-1.65]"
                /(?:OR|odds\s*ratio)[,;:\s=]*(-?\d+\.?\d*)\s*\[(?:95%?\s*(?:CI)?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)\]/gi,
                /(?:odds\s*ratio)(?:\s+\w+)*\s+(?:was|of|=)\s*(-?\d+\.?\d*)/gi,
                /(?:odds\s*ratio|OR)[,;:\s=]+(-?\d+\.?\d*)/gi
            ],
            MD: [
                // Enhanced MD patterns for continuous outcomes (v5.1.0)
                // "mean difference 2.5 (95% CI 1.2 to 3.8)" or "MD -14.8, 95% CI -15.5 to -14.1"
                /(?:MD|mean\s*difference)(?:\s+(?:with|for|in|of|between)(?:\s+[\w-]+)+)?[,;:\s=]*(-?\d+\.?\d*)\s*(?:kg|mm|points?|mmHg|bpm|ml|L|mg|%)?\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)(?:\s*\[CI\])?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+)\s*(-?\d+\.?\d*)/gi,
                // "between-group difference of 3.2 (95% CI 1.8-4.6)"
                /(?:between[\s-]*group\s+difference|absolute\s+difference|difference\s+(?:in|of|between))\s*(?:was|of|=)?\s*(-?\d+\.?\d*)\s*(?:kg|mm|points?|mmHg|%)?\s*[,;]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+)\s*(-?\d+\.?\d*)/gi,
                // "change of 0.24 kg (95% CI..." or "reduction of 2.3 points (95% CI..."
                /(?:change|reduction|improvement|decrease|increase)\s+(?:in\s+)?(?:[\w\s]+)?(?:was|of|=)?\s*(-?\d+\.?\d*)\s*(?:kg|mm|points?|mmHg|bpm|ml|L|mg)?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+)\s*(-?\d+\.?\d*)/gi,
                // "weighted mean difference -0.31" or "mean difference was 3.2"
                /(?:weighted\s+)?(?:mean\s+difference|MD)\s+(?:was|of|=)?\s*(-?\d+\.?\d*)/gi,
                // "difference −1.6%, 95% CI −7.6 to 4.4%"
                /difference\s+(-?\d+\.?\d*)\s*%?\s*[,;]?\s*95%?\s*CI\s*(-?\d+\.?\d*)\s*(?:[-–]|to)\s*(-?\d+\.?\d*)/gi,
                // NEW: "rate reduction, X percentage points" or "absolute rate reduction, X%"
                /(?:rate|risk)\s+reduction[,;:\s]+(-?\d+\.?\d*)\s*(?:percentage\s*points?|%)/gi,
                // NEW: "risk reduction, X%" with CI: "risk reduction, 67%; 95% CI 27-85%"
                /(?:risk|rate)\s+reduction[,;:\s]+(-?\d+\.?\d*)\s*%?\s*[;,]?\s*(?:95%?\s*(?:CI|confidence)[,;:\s]*)?(-?\d+\.?\d*)?\s*(?:[-–]|to)?\s*(-?\d+\.?\d*)?/gi,
                // NEW: "absolute rate reduction, 5.8 percentage points" or "absolute reduction, X%"
                /absolute\s+(?:rate\s+)?reduction[,;:\s]+(-?\d+\.?\d*)\s*(?:percentage\s*points?|%|percent)/gi,
                // NEW: "reduction of 25% in the rate" or "reduction of X percentage points"
                /reduction\s+of\s+(-?\d+\.?\d*)\s*(?:%|percent|percentage\s*points?)/gi,
                // NEW: Simple "difference, 0.017" or "difference: 3.2"
                /(?:^|[;.]\s*)difference[,;:\s]+(-?\d+\.?\d*)/gim,
                // NEW: Handle CI in square brackets [0.65-0.85] or [0.65 to 0.85]
                /(?:MD|mean\s*difference)[,;:\s=]*(-?\d+\.?\d*)\s*(?:\[)?(?:95%?\s*(?:CI)?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+)\s*(-?\d+\.?\d*)(?:\])?/gi,
                // NEW: "between-group difference, 2.0 percentage points; 95% CI/credible interval"
                /between[\s-]*group\s+difference[,;:\s]+(-?\d+\.?\d*)\s*(?:percentage\s*points?|%)?[,;]?\s*(?:95%?\s*(?:CI|credible\s*interval|confidence)[,;:\s]*)?(-?\d+\.?\d*)?\s*(?:[-–]|to)?\s*(-?\d+\.?\d*)?/gi,
                // NEW: "change from baseline, X" or "change from baseline of X points"
                /change\s+from\s+baseline[,;:\s]+(?:of\s+)?(-?\d+\.?\d*)\s*(?:points?|%|kg|mm)?/gi,
                // NEW: "difference in X was Y" or "difference in means: Y"
                /difference\s+in\s+(?:[\w\s]+)(?:was|:)\s*(-?\d+\.?\d*)/gi,
                // NEW: "absolute difference, 10 percent" for continuous outcomes
                /absolute\s+difference[,;:\s]+(-?\d+\.?\d*)\s*(?:%|percent|percentage\s*points?)?/gi
            ],
            SMD: [
                // Enhanced SMD/effect size patterns
                /(?:SMD|standardized?\s*mean\s*difference)(?:\s+(?:with|for|in|of)\s+[\w-]+)?[,;:\s=]*(-?\d+\.?\d*)\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)(?:\s*\[CI\])?[,;:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+)\s*(-?\d+\.?\d*)/gi,
                // "effect size d = 0.67" or "effect size of 0.45"
                /effect\s*size\s*(?:d\s*)?[=:]?\s*(-?\d+\.?\d*)\s*[,;]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)?[,;:\s]*)?(-?\d+\.?\d*)?\s*(?:[-–]|\s+to\s+)?\s*(-?\d+\.?\d*)?/gi,
                // "Cohen's d = 0.52" or "Hedges' g = 0.48"
                /(?:cohen['']?s?\s*d|hedges['']?\s*g|glass['']?s?\s*[Δδd])\s*[=:]?\s*(-?\d+\.?\d*)\s*[,;]?\s*(?:\(?95%?\s*(?:CI)?[,;:\s]*)?(-?\d+\.?\d*)?\s*(?:[-–]|\s+to\s+)?\s*(-?\d+\.?\d*)?/gi,
                // Simple SMD value
                /(?:SMD|standardized?\s*mean\s*difference)\s+(?:was|of|=)?\s*(-?\d+\.?\d*)/gi
            ],
            RD: [
                // RD -0.08, 95% CI -0.12 to -0.04 or risk difference
                /(?:RD|risk\s*difference|ARR|absolute\s*risk\s*reduction)[,;:\s=]*(-?\d+\.?\d*)\s*%?\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)[,:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+)\s*(-?\d+\.?\d*)/gi,
                /(?:risk\s*difference)(?:\s+\w+)*\s+(?:was|of|=)\s*(-?\d+\.?\d*)\s*%?/gi,
                // NEW: "absolute difference, 10 percent" - handle various suffix formats
                /(?:absolute\s*difference)[,;:\s=]*(-?\d+\.?\d*)\s*(?:%|percent|percentage\s*points?)?/gi,
                /(?:difference)[,;:\s=]*(-?\d+\.?\d*)\s*(?:percentage\s*points|%)/gi
            ],
            RateRatio: [
                // Rate ratio 0.72; 95% CI 0.58-0.89 or incidence rate ratio
                /(?:rate\s*ratio|IRR|incidence\s*rate\s*ratio)[,;:\s=]*(-?\d+\.?\d*)\s*[;,]?\s*(?:\(?95%?\s*(?:CI|confidence\s*interval)[,:\s]*)?(-?\d+\.?\d*)\s*(?:[-–]|\s+to\s+|,)\s*(-?\d+\.?\d*)/gi,
                /(?:rate\s*ratio|IRR|incidence\s*rate\s*ratio)\s+(?:was|of|=)\s*(-?\d+\.?\d*)/gi
            ],
            NNT: [
                /(?:NNT|number\s*needed\s*to\s*treat)[,;:\s=]*(\d+\.?\d*)/gi,
                /(?:number\s*needed\s*to\s*treat)(?:\s+\w+)*\s+(?:was|of|=)\s*(\d+\.?\d*)/gi,
                /(?:needed\s*to\s*treat)[,;:\s=was]*\s*(\d+)/gi
            ],
            NNH: [
                /(?:NNH|number\s*needed\s*to\s*harm)[,;:\s=]*(\d+\.?\d*)/gi,
                /(?:number\s*needed\s*to\s*harm)(?:\s+\w+)*\s+(?:was|of|=)\s*(\d+\.?\d*)/gi,
                /(?:needed\s*to\s*harm)[,;:\s=was]*\s*(\d+)/gi
            ],
            // P-value patterns
            Pvalue: [
                /[Pp][-\s]*(?:value)?\s*[=<>]\s*(0?\.\d+)/g,
                /[Pp]\s*[<>]\s*(\.\d+|\d+\.\d+)/g,
                /[Pp]\s*=\s*(\d+\.\d+(?:e[+-]?\d+)?)/gi,
                /(?:significance|significant)[,;\s]+[Pp]\s*[=<>]\s*(0?\.\d+)/gi
            ],
            // Sample size patterns
            SampleSize: [
                /[Nn]\s*[=:]\s*([\d,]+)/g,
                /([\d,]+)\s*(?:patients|participants|subjects|individuals)/gi,
                /(?:enrolled|randomized|recruited|included)\s*([\d,]+)\s*(?:patients|participants)?/gi,
                /(?:sample\s*size|total\s*of)\s*(?:was|:)?\s*([\d,]+)/gi
            ],
            // Follow-up duration patterns (ENHANCED)
            FollowUp: [
                /(?:median|mean)?\s*follow[\s-]*up\s*(?:of|was|:)?\s*([\d.]+)\s*(years?|months?|weeks?|days?)/gi,
                /(?:followed|followed\s+for)\s*([\d.]+)\s*(years?|months?|weeks?|days?)/gi,
                /(?:duration|period)\s*(?:of|was|:)?\s*([\d.]+)\s*(years?|months?|weeks?|days?)/gi,
                // "12-month follow-up" or "24 month follow-up"
                /([\d.]+)[\s-]*(month|year|week|day)s?\s+follow[\s-]*up/gi,
                // "at 12 months" or "at 2 years"
                /(?:at|over)\s+([\d.]+)\s*(months?|years?|weeks?)/gi,
                // "through X months/years"
                /through\s+([\d.]+)\s*(months?|years?|weeks?)/gi
            ],
            // Event rate patterns
            EventRate: [
                /(?:event|mortality|death|hospitalization)\s*rate\s*(?:of|was|:)?\s*([\d.]+)\s*%/gi,
                /(?:incidence|occurrence)\s*(?:of|was|:)?\s*([\d.]+)\s*%/gi,
                /([\d.]+)\s*%\s*(?:event|mortality|death)\s*rate/gi
            ]
        };

        for (const [type, patternList] of Object.entries(patterns)) {
            for (const pattern of patternList) {
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const result = {
                        type,
                        value: parseFloat(match[1]),
                        raw: match[0],
                        position: match.index
                    };

                    if (match[2] && match[3]) {
                        let ciA = parseFloat(match[2]);
                        let ciB = parseFloat(match[3]);
                        // Normalize reversed bounds (lo>hi from a source typo) to
                        // an ordered interval [lower, upper] so a downstream SE
                        // can't get a negative half-width. Mirrors the WebApp.
                        if (isFinite(ciA) && isFinite(ciB) && ciA > ciB) { const t = ciA; ciA = ciB; ciB = t; }
                        result.ciLo = ciA;
                        result.ciHi = ciB;
                    }

                    const start = Math.max(0, match.index - 50);
                    const end = Math.min(text.length, match.index + match[0].length + 50);
                    result.context = text.slice(start, end);
                    result.isPrimary = result.context.toLowerCase().includes('primary');

                    switch(type) {
                        case 'HR': measures.hazardRatios.push(result); break;
                        case 'RR': measures.relativeRisks.push(result); break;
                        case 'OR': measures.oddsRatios.push(result); break;
                        case 'MD': measures.meanDifferences.push(result); break;
                        case 'SMD': measures.standardizedMeanDifferences.push(result); break;
                        case 'RD': measures.riskDifferences.push(result); break;
                        case 'RateRatio': measures.rateRatios.push(result); break;
                        case 'NNT': measures.numberNeededToTreat.push(result); break;
                        case 'NNH': measures.numberNeededToHarm.push(result); break;
                        case 'Pvalue': measures.pValues.push(result); break;
                        case 'SampleSize': measures.sampleSizes.push(result); break;
                        case 'FollowUp': measures.followUpDurations.push(result); break;
                        case 'EventRate': measures.eventRates.push(result); break;
                    }
                }
            }
        }

        return measures;
    },

    scoreQuality(result, text) {
        let completeness = 0;
        let totalFields = 0;

        const checkField = (value) => {
            totalFields++;
            if (value !== undefined && value !== null && value !== '') completeness++;
        };

        checkField(result.study?.acronym);
        checkField(result.population?.total);
        checkField(result.treatment?.n);
        checkField(result.control?.n);
        checkField(result.contrast?.effect);
        checkField(result.contrast?.ciLo);
        checkField(result.contrast?.ciHi);
        checkField(result.baseline?.age?.mean);

        const score = totalFields > 0 ? completeness / totalFields : 0;
        let grade = 'D';
        if (score >= 0.8) grade = 'A';
        else if (score >= 0.6) grade = 'B';
        else if (score >= 0.4) grade = 'C';

        return {
            overall: score,
            grade,
            completeness: score,
            confidence: result._meta?.domainConfidence || 0.5,
            fieldsFound: completeness,
            totalFields
        };
    },

    assessBias(result, text) {
        const textLower = text.toLowerCase();
        const bias = {
            publicationBias: [],
            reportingBias: [],
            methodologicalConcerns: [],
            overallRisk: 'low'
        };

        // Check for industry funding
        if (textLower.includes('funded by') || textLower.includes('supported by') ||
            textLower.includes('pharmaceutical') || textLower.includes('pharma')) {
            if (textLower.includes('novartis') || textLower.includes('pfizer') ||
                textLower.includes('astrazeneca') || textLower.includes('boehringer') ||
                textLower.includes('lilly') || textLower.includes('merck') ||
                textLower.includes('bayer') || textLower.includes('bristol')) {
                bias.methodologicalConcerns.push({
                    type: 'industry_funding',
                    description: 'Industry funding detected',
                    severity: 'low'
                });
            }
        }

        // Check for open-label
        if (textLower.includes('open-label') || textLower.includes('open label')) {
            bias.methodologicalConcerns.push({
                type: 'open_label',
                description: 'Open-label design may introduce bias',
                severity: 'moderate'
            });
        }

        // Check for borderline significance
        const pValue = result.contrast?.pValue;
        if (pValue && pValue >= 0.04 && pValue <= 0.05) {
            bias.publicationBias.push({
                type: 'borderline_significance',
                description: 'P-value is borderline significant',
                severity: 'low'
            });
        }

        // Check for missing CI
        if (result.contrast?.effect && (!result.contrast?.ciLo || !result.contrast?.ciHi)) {
            bias.reportingBias.push({
                type: 'missing_ci',
                description: 'Effect reported without confidence interval',
                severity: 'moderate'
            });
        }

        const totalIssues = bias.publicationBias.length + bias.reportingBias.length +
                          bias.methodologicalConcerns.length;
        const moderateIssues = [...bias.publicationBias, ...bias.reportingBias,
                               ...bias.methodologicalConcerns].filter(i => i.severity === 'moderate').length;

        if (moderateIssues >= 2 || totalIssues >= 4) {
            bias.overallRisk = 'high';
        } else if (moderateIssues >= 1 || totalIssues >= 2) {
            bias.overallRisk = 'moderate';
        }

        bias.summary = { totalIssues, moderateIssues };

        return bias;
    },

    getSummary(result) {
        return {
            acronym: result.study?.acronym || 'Unknown',
            domain: result._meta?.domain || 'Unknown',
            domainConfidence: result._meta?.domainConfidence || 0,
            totalN: result.population?.total,
            treatmentN: result.treatment?.n,
            controlN: result.control?.n,
            meanAge: result.baseline?.age?.mean,
            primaryEffect: result.contrast?.effect,
            effectType: result.contrast?.effectType || 'HR',
            ciLo: result.contrast?.ciLo,
            ciHi: result.contrast?.ciHi,
            pValue: result.contrast?.pValue,
            registration: result.prisma?.registrationNumber,
            qualityGrade: result._meta?.qualityScore?.grade,
            qualityScore: result._meta?.qualityScore?.overall,
            biasRisk: result._meta?.biasAssessment?.overallRisk,
            drugsFound: result.aiEntities?.drugs?.length || 0,
            biomarkersFound: result.aiEntities?.biomarkers?.length || 0,
            effectMeasures: (result.effectMeasures?.hazardRatios?.length || 0) +
                           (result.effectMeasures?.relativeRisks?.length || 0) +
                           (result.effectMeasures?.oddsRatios?.length || 0) +
                           (result.effectMeasures?.meanDifferences?.length || 0) +
                           (result.effectMeasures?.standardizedMeanDifferences?.length || 0) +
                           (result.effectMeasures?.rateRatios?.length || 0),
            pValuesFound: result.effectMeasures?.pValues?.length || 0,
            sampleSizesFound: result.effectMeasures?.sampleSizes?.length || 0,
            followUpFound: result.effectMeasures?.followUpDurations?.length || 0,
            eventRatesFound: result.effectMeasures?.eventRates?.length || 0
        };
    }
};

// ============================================================
// TRUTHCERT-INSPIRED VALIDATION v1.0
// Corruption detection based on TC-RCT pack patterns
// ============================================================

const CorruptionDetector = {
    DETECTION_RATES: {
        arm_swap: 0.92, unit_shift: 0.90, timepoint_shift: 0.88,
        row_bleed: 0.78, endpoint_swap: 0.72, ocr_number_confuse: 0.60
    },

    detectAll(extracted, sourceText) {
        const results = {
            corruptions: [],
            warnings: [],
            confidence: 1.0,
            passed: true
        };

        const detections = [
            this.detectArmSwap(extracted, sourceText),
            this.detectUnitShift(extracted, sourceText),
            this.detectRowBleed(extracted, sourceText),
            this.detectTimepointShift(extracted, sourceText)
        ];

        for (const detection of detections) {
            if (detection.detected) {
                results.corruptions.push(detection);
                results.passed = false;
                results.confidence *= (1 - detection.severity);
            }
            if (detection.warning) {
                results.warnings.push({ type: detection.type, message: detection.warning });
            }
        }

        results.confidence = Math.max(0, results.confidence);
        return results;
    },

    detectArmSwap(extracted, sourceText) {
        const result = { type: 'arm_swap', detected: false, severity: 0.9, evidence: [], warning: null };
        const textLower = sourceText.toLowerCase();
        const effect = extracted.contrast?.effect || extracted.effectMeasures?.primary?.value;

        if (!effect) return result;

        const benefitIndicators = ['reduced', 'decreased', 'lower', 'improved', 'beneficial', 'protective'];
        const harmIndicators = ['increased', 'higher', 'worse', 'more events', 'harmful'];

        const hasBenefitLanguage = benefitIndicators.some(ind => textLower.includes(ind));
        const hasHarmLanguage = harmIndicators.some(ind => textLower.includes(ind));

        if (effect < 1 && hasHarmLanguage && !hasBenefitLanguage) {
            result.detected = true;
            result.evidence.push(`Effect ${effect.toFixed(2)} < 1 but text indicates harm`);
        }
        if (effect > 1 && hasBenefitLanguage && !hasHarmLanguage) {
            result.detected = true;
            result.evidence.push(`Effect ${effect.toFixed(2)} > 1 but text indicates benefit`);
        }

        return result;
    },

    detectUnitShift(extracted, sourceText) {
        const result = { type: 'unit_shift', detected: false, severity: 0.7, evidence: [], warning: null };
        const effect = extracted.contrast?.effect;
        const ciLo = extracted.contrast?.ciLo;
        const ciHi = extracted.contrast?.ciHi;

        if (effect && ciLo && ciHi && effect > 0 && ciLo > 0 && ciHi > 0) {
            const logEffect = Math.log(effect);
            const logCiLo = Math.log(ciLo);
            const logCiHi = Math.log(ciHi);
            const lowerDist = logEffect - logCiLo;
            const upperDist = logCiHi - logEffect;

            if (lowerDist > 0 && upperDist > 0) {
                const asymmetry = Math.abs(lowerDist - upperDist) / Math.max(lowerDist, upperDist);
                if (asymmetry > 0.5) {
                    result.warning = 'CI asymmetry on log scale suggests possible scale error';
                }
            }
        }

        return result;
    },

    detectRowBleed(extracted, sourceText) {
        const result = { type: 'row_bleed', detected: false, severity: 0.5, evidence: [], warning: null };

        const ciLo = extracted.contrast?.ciLo;
        const ciHi = extracted.contrast?.ciHi;
        const effect = extracted.contrast?.effect;

        if (ciLo === ciHi && ciLo !== undefined) {
            result.detected = true;
            result.evidence.push('CI lower equals CI upper - likely row bleed');
        }

        if (effect !== undefined && (effect === ciLo || effect === ciHi)) {
            result.warning = 'Effect equals CI bound - possible row bleed';
        }

        const treatmentN = extracted.treatment?.n;
        const controlN = extracted.control?.n;
        if (treatmentN && controlN && treatmentN === controlN) {
            const nMatches = sourceText.match(/n\s*=?\s*(\d{2,})/gi);
            if (nMatches && nMatches.length >= 2) {
                const uniqueNs = [...new Set(nMatches.map(m => parseInt(m.match(/\d+/)[0])))];
                if (uniqueNs.length > 1 && !uniqueNs.includes(treatmentN)) {
                    result.warning = 'Treatment/control N identical but text shows different values';
                }
            }
        }

        return result;
    },

    detectTimepointShift(extracted, sourceText) {
        const result = { type: 'timepoint_shift', detected: false, severity: 0.6, evidence: [], warning: null };
        const textLower = sourceText.toLowerCase();
        const extractedFollowup = extracted.followup?.median || extracted.followup?.duration ||
                                  extracted.followupNormalized?.normalized;

        if (!extractedFollowup) return result;

        const followupPatterns = [
            /follow[- ]?up[^0-9]*(\d+\.?\d*)\s*(years?|months?|weeks?)/gi,
            /(\d+\.?\d*)\s*(years?|months?)\s*(?:of\s*)?follow[- ]?up/gi
        ];

        const foundFollowups = [];
        for (const pattern of followupPatterns) {
            let match;
            while ((match = pattern.exec(textLower)) !== null) {
                const value = parseFloat(match[1]);
                const unit = match[2].toLowerCase();
                let months = value;
                if (unit.startsWith('year')) months = value * 12;
                if (unit.startsWith('week')) months = value / 4.33;
                foundFollowups.push({ value, unit, months });
            }
        }

        if (foundFollowups.length > 0) {
            const matches = foundFollowups.some(f => Math.abs(f.months - extractedFollowup) < 0.5);
            if (!matches) {
                const closestMatch = foundFollowups.reduce((a, b) =>
                    Math.abs(a.months - extractedFollowup) < Math.abs(b.months - extractedFollowup) ? a : b
                );
                if (Math.abs(closestMatch.months - extractedFollowup * 12) < 0.5) {
                    result.detected = true;
                    result.evidence.push('Possible years/months confusion');
                }
            }
        }

        return result;
    }
};

const ValidationGates = {
    validate(extracted, sourceText) {
        const results = {
            passed: true,
            gates: {},
            confidence: 1.0,
            recommendation: null
        };

        // Gate B3: Structural Validation
        results.gates.B3 = this.runGateB3(extracted);
        if (!results.gates.B3.passed) {
            results.passed = false;
            results.confidence *= 0.7;
        }

        // Gate B8: Adversarial Validation (corruption detection)
        results.gates.B8 = this.runGateB8(extracted, sourceText);
        if (!results.gates.B8.passed) {
            results.passed = false;
            results.confidence *= 0.6;
        }

        // Generate recommendation
        if (results.passed) {
            results.recommendation = 'Extraction passed all validation gates - suitable for use';
        } else if (results.confidence >= 0.7) {
            results.recommendation = 'Minor validation issues - manual review recommended';
        } else if (results.confidence >= 0.5) {
            results.recommendation = 'Significant validation issues - careful manual verification required';
        } else {
            results.recommendation = 'Major validation failures - consider re-extraction or manual extraction';
        }

        return results;
    },

    runGateB3(extracted) {
        const result = { name: 'B3_Structural', passed: true, checks: [] };

        // Arithmetic check
        const arithCheck = this.checkArithmetic(extracted);
        result.checks.push({ name: 'V-RCT-ARITH', passed: arithCheck.passed, details: arithCheck.issues });
        if (!arithCheck.passed) result.passed = false;

        // CI ordering check
        const ciCheck = this.checkCIOrdering(extracted);
        result.checks.push({ name: 'CI_ORDERING', passed: ciCheck.passed, details: ciCheck.message });
        if (!ciCheck.passed) result.passed = false;

        return result;
    },

    runGateB8(extracted, sourceText) {
        const result = { name: 'B8_Adversarial', passed: true, checks: [] };
        const corruptions = CorruptionDetector.detectAll(extracted, sourceText);

        result.checks.push({
            name: 'V-RCT-ADVERSARIAL',
            passed: corruptions.passed,
            details: corruptions.corruptions.map(c => `${c.type}: ${c.evidence.join(', ')}`),
            warnings: corruptions.warnings
        });

        if (!corruptions.passed) result.passed = false;
        return result;
    },

    checkArithmetic(extracted) {
        const issues = [];
        const treatN = extracted.treatment?.n;
        const controlN = extracted.control?.n;
        const totalN = extracted.population?.n || extracted.study?.n;

        if (treatN && controlN && totalN) {
            const expectedTotal = treatN + controlN;
            if (Math.abs(expectedTotal - totalN) > 10) {
                issues.push(`Total N (${totalN}) ≠ Treatment (${treatN}) + Control (${controlN})`);
            }
        }

        const treatEvents = extracted.treatment?.events;
        if (treatN && treatEvents && treatEvents > treatN) {
            issues.push(`Treatment events (${treatEvents}) > Treatment N (${treatN})`);
        }

        return { passed: issues.length === 0, issues };
    },

    checkCIOrdering(extracted) {
        const effect = extracted.contrast?.effect;
        const ciLo = extracted.contrast?.ciLo;
        const ciHi = extracted.contrast?.ciHi;

        if (effect === undefined || ciLo === undefined || ciHi === undefined) {
            return { passed: true, message: 'CI values not all present' };
        }

        if (ciLo >= effect || effect >= ciHi) {
            return { passed: false, message: `CI ordering violated: ${ciLo} < ${effect} < ${ciHi}` };
        }

        if (ciLo >= ciHi) {
            return { passed: false, message: `CI bounds inverted: lower (${ciLo}) >= upper (${ciHi})` };
        }

        return { passed: true, message: 'CI ordering correct' };
    }
};

// --- additions for Node consumption (not in the browser bundle) -------------

// Deep dot-path flatten. RCTExtractor_v4_8_AI.js looks up flat['contrast.effect'],
// flat['treatment.n'], flat['baseline.age.mean'], flat['followup.median'], etc.
// (see its fieldRanges / domainRequiredFields), i.e. nested keys joined by '.'.
// Arrays are kept as leaf values (no fieldRange targets an array element).
RCTExtractor.flatten = function flatten(obj, prefix, out) {
    out = out || {};
    prefix = prefix || '';
    if (obj === null || typeof obj !== 'object') return out;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        const path = prefix ? prefix + '.' + key : key;
        if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            flatten(val, path, out);
        } else {
            out[path] = val;
        }
    }
    return out;
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RCTExtractor,
        MedicalNER,
        NaiveBayesClassifier,
        WordEmbeddings,
        CorruptionDetector,
        ValidationGates,
    };
}
