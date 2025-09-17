// Comprehensive data validation utilities for medical report processing

/**
 * Validates lab values against reference ranges and clinical standards
 */
function validateLabValue(labName, value, unit, age = null, gender = null) {
  if (value === null || value === undefined) {
    return { isValid: false, reason: 'Missing value', severity: 'warning' };
  }

  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, reason: 'Invalid numeric value', severity: 'error' };
  }

  // Get reference ranges (can be enhanced with age/gender specific ranges)
  const ranges = getReferenceRanges(labName, age, gender);
  if (!ranges) {
    return { isValid: true, reason: 'No reference range available', severity: 'info' };
  }

  // Check for critical values
  const criticalRanges = getCriticalRanges(labName);
  if (criticalRanges) {
    if (value <= criticalRanges.criticalLow || value >= criticalRanges.criticalHigh) {
      return { 
        isValid: true, 
        reason: 'Critical value detected', 
        severity: 'critical',
        status: value <= criticalRanges.criticalLow ? 'critically_low' : 'critically_high'
      };
    }
  }

  // Check normal ranges
  if (value < ranges.min) {
    return { 
      isValid: true, 
      reason: 'Below normal range', 
      severity: 'warning',
      status: 'low',
      referenceRange: `${ranges.min}-${ranges.max} ${ranges.unit}`
    };
  }
  
  if (value > ranges.max) {
    return { 
      isValid: true, 
      reason: 'Above normal range', 
      severity: 'warning',
      status: 'high',
      referenceRange: `${ranges.min}-${ranges.max} ${ranges.unit}`
    };
  }

  return { 
    isValid: true, 
    reason: 'Within normal range', 
    severity: 'success',
    status: 'normal',
    referenceRange: `${ranges.min}-${ranges.max} ${ranges.unit}`
  };
}

/**
 * Get reference ranges for lab values (can be enhanced with age/gender specific ranges)
 */
function getReferenceRanges(labName, age = null, gender = null) {
  const baseRanges = {
    hemoglobin: { min: 12, max: 16, unit: 'g/dL' },
    glucose: { min: 70, max: 140, unit: 'mg/dL' },
    creatinine: { min: 0.6, max: 1.3, unit: 'mg/dL' },
    wbc: { min: 4.5, max: 11.0, unit: '10^3/µL' },
    platelets: { min: 150, max: 450, unit: '10^3/µL' },
    sodium: { min: 136, max: 145, unit: 'mmol/L' },
    potassium: { min: 3.5, max: 5.0, unit: 'mmol/L' },
    chloride: { min: 98, max: 107, unit: 'mmol/L' },
    co2: { min: 22, max: 28, unit: 'mmol/L' },
    urea: { min: 7, max: 20, unit: 'mg/dL' },
    hba1c: { min: 4, max: 6, unit: '%' },
    alt: { min: 7, max: 56, unit: 'U/L' },
    ast: { min: 10, max: 40, unit: 'U/L' },
    bilirubin: { min: 0.1, max: 1.2, unit: 'mg/dL' },
    albumin: { min: 3.5, max: 5.0, unit: 'g/dL' },
    calcium: { min: 8.5, max: 10.5, unit: 'mg/dL' },
    phosphorus: { min: 2.5, max: 4.5, unit: 'mg/dL' },
    magnesium: { min: 1.7, max: 2.2, unit: 'mg/dL' },
    cholesterol: { min: 0, max: 200, unit: 'mg/dL' },
    hdl: { min: 40, max: 100, unit: 'mg/dL' },
    ldl: { min: 0, max: 100, unit: 'mg/dL' },
    triglycerides: { min: 0, max: 150, unit: 'mg/dL' },
    tsh: { min: 0.4, max: 4.0, unit: 'mIU/L' },
    t4: { min: 4.5, max: 12.0, unit: 'µg/dL' },
    t3: { min: 80, max: 200, unit: 'ng/dL' },
    ferritin: { min: 15, max: 200, unit: 'ng/mL' },
    iron: { min: 60, max: 170, unit: 'µg/dL' },
    tibc: { min: 240, max: 450, unit: 'µg/dL' },
    transferrin: { min: 200, max: 400, unit: 'mg/dL' },
    vitamin_d: { min: 30, max: 100, unit: 'ng/mL' },
    vitamin_b12: { min: 200, max: 900, unit: 'pg/mL' },
    folate: { min: 3, max: 20, unit: 'ng/mL' },
    psa: { min: 0, max: 4, unit: 'ng/mL' },
    crp: { min: 0, max: 3, unit: 'mg/L' },
    esr: { min: 0, max: 20, unit: 'mm/hr' },
    pt: { min: 11, max: 13, unit: 'seconds' },
    ptt: { min: 25, max: 35, unit: 'seconds' },
    inr: { min: 0.8, max: 1.1, unit: 'ratio' },
    d_dimer: { min: 0, max: 0.5, unit: 'mg/L' },
    troponin: { min: 0, max: 0.04, unit: 'ng/mL' },
    ck_mb: { min: 0, max: 5, unit: 'ng/mL' },
    bnp: { min: 0, max: 100, unit: 'pg/mL' },
    nt_probnp: { min: 0, max: 125, unit: 'pg/mL' },
    lactate: { min: 0.5, max: 2.2, unit: 'mmol/L' },
    ammonia: { min: 15, max: 45, unit: 'µmol/L' },
    uric_acid: { min: 3.5, max: 7.2, unit: 'mg/dL' },
    lactate_dehydrogenase: { min: 140, max: 280, unit: 'U/L' },
    alkaline_phosphatase: { min: 44, max: 147, unit: 'U/L' },
    gamma_gt: { min: 9, max: 48, unit: 'U/L' },
    amylase: { min: 23, max: 85, unit: 'U/L' },
    lipase: { min: 0, max: 60, unit: 'U/L' }
  };

  // Age and gender specific adjustments
  let ranges = { ...baseRanges[labName] };
  if (!ranges) return null;

  // Age-specific adjustments
  if (age !== null) {
    if (labName === 'creatinine' && age > 65) {
      ranges.max = 1.2; // Slightly higher for elderly
    }
    if (labName === 'hemoglobin' && age > 65) {
      ranges.min = 11; // Slightly lower for elderly
    }
  }

  // Gender-specific adjustments
  if (gender !== null) {
    if (labName === 'hemoglobin' && gender === 'female') {
      ranges.min = 11; // Lower for females
    }
    if (labName === 'ferritin' && gender === 'female') {
      ranges.min = 10; // Lower for females
    }
  }

  return ranges;
}

/**
 * Get critical value ranges that require immediate attention
 */
function getCriticalRanges(labName) {
  const criticalRanges = {
    glucose: { criticalLow: 40, criticalHigh: 400 },
    sodium: { criticalLow: 120, criticalHigh: 160 },
    potassium: { criticalLow: 2.5, criticalHigh: 6.5 },
    creatinine: { criticalLow: 0.2, criticalHigh: 5.0 },
    hemoglobin: { criticalLow: 6, criticalHigh: 20 },
    platelets: { criticalLow: 20, criticalHigh: 1000 },
    wbc: { criticalLow: 1.0, criticalHigh: 30.0 },
    troponin: { criticalLow: 0, criticalHigh: 0.1 },
    lactate: { criticalLow: 0, criticalHigh: 4.0 },
    ammonia: { criticalLow: 0, criticalHigh: 100 }
  };

  return criticalRanges[labName] || null;
}

/**
 * Validates extracted metadata
 */
function validateMetadata(meta) {
  const issues = [];
  const warnings = [];

  if (!meta.patientName && !meta.patientId) {
    issues.push('No patient identification found');
  }

  if (!meta.date) {
    warnings.push('No report date found');
  }

  // Validate date format
  if (meta.date) {
    const dateRegex = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$|^\d{4}[\-]\d{2}[\-]\d{2}$/;
    if (!dateRegex.test(meta.date)) {
      warnings.push('Date format may be invalid');
    }
  }

  // Validate age if present
  if (meta.age !== undefined) {
    if (meta.age < 0 || meta.age > 150) {
      issues.push('Invalid age value');
    }
  }

  // Validate gender if present
  if (meta.gender && !['male', 'female', 'm', 'f'].includes(meta.gender.toLowerCase())) {
    warnings.push('Gender value may be invalid');
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    score: issues.length === 0 ? (warnings.length === 0 ? 1.0 : 0.7) : 0.3
  };
}

/**
 * Validates overall extraction quality
 */
function validateExtractionQuality(extractedData) {
  const labs = Array.isArray(extractedData?.labs) ? extractedData.labs : [];
  const meta = extractedData?.meta || {};
  
  let totalScore = 0;
  let maxScore = 0;
  const issues = [];
  const warnings = [];

  // Validate metadata
  const metaValidation = validateMetadata(meta);
  totalScore += metaValidation.score * 0.2;
  maxScore += 0.2;
  issues.push(...metaValidation.issues);
  warnings.push(...metaValidation.warnings);

  // Validate lab values
  if (labs.length === 0) {
    issues.push('No lab values extracted');
    totalScore += 0;
  } else {
    maxScore += 0.6;
    let validLabs = 0;
    let highConfidenceLabs = 0;

    for (const lab of labs) {
      const validation = validateLabValue(lab.name, lab.value, lab.unit, meta.age, meta.gender);
      
      if (validation.isValid) {
        validLabs++;
        if (lab.confidence >= 0.7) {
          highConfidenceLabs++;
        }
        
        if (validation.severity === 'critical') {
          issues.push(`Critical value: ${lab.name} = ${lab.value} ${lab.unit}`);
        } else if (validation.severity === 'warning') {
          warnings.push(`${lab.name}: ${validation.reason}`);
        }
      } else {
        issues.push(`${lab.name}: ${validation.reason}`);
      }
    }

    const labQualityScore = (validLabs / labs.length) * 0.6;
    totalScore += labQualityScore;

    if (highConfidenceLabs / labs.length < 0.5) {
      warnings.push('Low confidence in extracted lab values');
    }
  }

  // Check for critical lab values
  maxScore += 0.2;
  const criticalLabs = ['hemoglobin', 'glucose', 'creatinine', 'sodium', 'potassium'];
  const foundCritical = criticalLabs.some(labName => 
    labs.some(lab => lab.name === labName && lab.value !== null)
  );
  
  if (foundCritical) {
    totalScore += 0.2;
  } else {
    warnings.push('No critical lab values found');
  }

  const finalScore = maxScore > 0 ? totalScore / maxScore : 0;

  return {
    score: Math.max(0, Math.min(1, finalScore)),
    issues,
    warnings,
    labCount: labs.length,
    validLabCount: labs.filter(lab => {
      const validation = validateLabValue(lab.name, lab.value, lab.unit, meta.age, meta.gender);
      return validation.isValid;
    }).length,
    highConfidenceCount: labs.filter(lab => lab.confidence >= 0.7).length,
    criticalValues: labs.filter(lab => {
      const validation = validateLabValue(lab.name, lab.value, lab.unit, meta.age, meta.gender);
      return validation.severity === 'critical';
    })
  };
}

/**
 * Sanitizes and normalizes lab values
 */
function sanitizeLabValue(value, unit) {
  if (value === null || value === undefined) return null;
  
  // Convert to number
  let numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d.,\-+eE]/g, '')) : value;
  
  if (isNaN(numValue)) return null;
  
  // Unit conversions for common cases
  if (unit && unit.toLowerCase().includes('mmol') && unit.toLowerCase().includes('l')) {
    // Convert mmol/L to mg/dL for glucose
    if (unit.toLowerCase().includes('glucose')) {
      numValue = numValue * 18.0182;
    }
  }
  
  return numValue;
}

module.exports = {
  validateLabValue,
  validateMetadata,
  validateExtractionQuality,
  sanitizeLabValue,
  getReferenceRanges,
  getCriticalRanges
};
