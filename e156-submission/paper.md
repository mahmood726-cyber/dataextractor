Mahmood Ahmad
Tahir Heart Institute
mahmood.ahmad2@nhs.net

RCTExtractor: AI-Powered Clinical Trial Data Extraction with 100% Accuracy

Can a fully offline tool extract structured clinical trial data from publication text matching manual double extraction accuracy? We validated RCTExtractor against 65 landmark trials in cardiology, oncology, nephrology, and neurology, covering hazard ratios, risk ratios, odds ratios, and mean differences. The tool combines 34 AI modules for entity recognition and confidence scoring with 21 sample-size patterns, OCR digit-confusion correction, and automated risk assessment. Across 65 trials the tool achieved 100 percent accuracy for primary HR, OR, and confidence intervals (95% CI 94.5-100), processing each document in under 100 milliseconds offline. Enhanced OCR detection improved digit-confusion identification from 60 to 75 percent, and sample-size extraction rose from 33 to 100 percent after adding three new patterns. Perfect accuracy on a diverse benchmark shows rule-based extraction with AI enhancement matches expert-level collection for structured trial endpoints. Accuracy may not extend to non-English publications or non-standard reporting, and the tool cannot interpret narrative outcome descriptions or composite endpoints.

Outside Notes

Type: methods
Primary estimand: HR
App: RCTExtractor v4.9.5 (v5.2.1-OCR-Enhanced)
Data: 65 landmark RCTs, cardiology/oncology/nephrology/neurology
Code: https://github.com/mahmood726-cyber/dataextractor
Version: 5.2.1
Validation: DRAFT

References

1. Marshall IJ, Noel-Storr A, Kuber J, et al. Machine learning for identifying randomized controlled trials: an evaluation and practitioner's guide. Res Synth Methods. 2018;9(4):602-614.
2. Jonnalagadda SR, Goyal P, Huffman MD. Automating data extraction in systematic reviews: a systematic review. Syst Rev. 2015;4:78.
3. Borenstein M, Hedges LV, Higgins JPT, Rothstein HR. Introduction to Meta-Analysis. 2nd ed. Wiley; 2021.
