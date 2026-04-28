"""
RCT Extractor - Extract structured data from clinical trial publications.

A Python wrapper for the RCTExtractor JavaScript engine that extracts
PICO elements, effect sizes, and study characteristics from clinical
trial texts and PDFs.

Example:
    >>> from rctextractor import RCTExtractor
    >>> extractor = RCTExtractor()
    >>> result = extractor.extract('''
    ...     In this double-blind, placebo-controlled trial, 500 patients
    ...     with heart failure were randomized to receive dapagliflozin
    ...     (n=250) or placebo (n=250). The primary endpoint of cardiovascular
    ...     death or hospitalization occurred in 16.3% of the dapagliflozin
    ...     group vs 21.2% in placebo (HR 0.74, 95% CI 0.65-0.85, p<0.001).
    ... ''')
    >>> print(result.population.total_n)
    500
    >>> print(result.primary_outcomes[0].effect_size.estimate)
    0.74

Quick functions:
    >>> from rctextractor import extract, extract_pdf, batch_extract
    >>> result = extract("A randomized trial of 100 patients...")
    >>> result = extract_pdf("path/to/paper.pdf")
    >>> results = batch_extract([text1, text2, text3])
"""

__version__ = "0.1.0"
__author__ = "RCT Extractor Team"
__license__ = "MIT"

from .extractor import (
    RCTExtractor,
    extract,
    extract_pdf,
    batch_extract
)

from .types import (
    ExtractionResult,
    BatchResult,
    StudyMetadata,
    StudyDesignInfo,
    PopulationInfo,
    InterventionInfo,
    Outcome,
    EffectSize,
    ArmData,
    Demographics,
    StudyDesign,
    BlindingType
)

__all__ = [
    # Main class
    "RCTExtractor",

    # Convenience functions
    "extract",
    "extract_pdf",
    "batch_extract",

    # Data types
    "ExtractionResult",
    "BatchResult",
    "StudyMetadata",
    "StudyDesignInfo",
    "PopulationInfo",
    "InterventionInfo",
    "Outcome",
    "EffectSize",
    "ArmData",
    "Demographics",
    "StudyDesign",
    "BlindingType",
]
