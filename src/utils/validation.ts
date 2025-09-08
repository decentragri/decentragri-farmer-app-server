/**
 * Professional Validation Utility for DecentrAgri AI Agent
 * Provides business logic validation beyond basic schema checks
 */

import { ValidationError } from '../utils/errors';
import type { ErrorContext } from '../utils/errors';
import type { CropPlanningRequest } from '../ai.services/crop.planning.service/crop.planning.interface';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validation rules and constraints
 */
export const VALIDATION_CONSTANTS = {
  FARM_SIZE: {
    MIN: 0.01, // Minimum 0.01 hectares
    MAX: 10000, // Maximum 10,000 hectares
  },
  COORDINATES: {
    LAT: { MIN: -90, MAX: 90 },
    LNG: { MIN: -180, MAX: 180 },
  },
  PLANNING_HORIZON: {
    MIN: 1, // Minimum 1 month
    MAX: 60, // Maximum 5 years
  },
  CROP_TYPES: [
    'wheat', 'rice', 'corn', 'soybeans', 'cotton', 'tomatoes', 'potatoes',
    'onions', 'carrots', 'lettuce', 'spinach', 'beans', 'peas', 'cabbage',
    'broccoli', 'cauliflower', 'peppers', 'cucumbers', 'squash', 'pumpkins',
    'watermelon', 'cantaloupe', 'strawberries', 'blueberries', 'apples',
    'oranges', 'grapes', 'avocados', 'almonds', 'pecans', 'sunflower',
    'canola', 'barley', 'oats', 'rye', 'sorghum', 'millet', 'quinoa'
  ],
  SOIL_TYPES: [
    'sandy', 'loamy', 'clay', 'silty', 'peaty', 'chalky', 'volcanic'
  ],
  IRRIGATION_SYSTEMS: [
    'drip', 'sprinkler', 'flood', 'furrow', 'center_pivot', 'none'
  ],
  SEASONS: [
    'spring', 'summer', 'fall', 'winter', 'dry_season', 'wet_season'
  ],
  RISK_TOLERANCE: ['low', 'medium', 'high'],
  PROFIT_PRIORITY: ['maximum', 'stable', 'sustainable']
};

/**
 * Advanced crop planning validation
 */
export class CropPlanningValidator {
  /**
   * Validate crop planning request with business logic
   */
  static validateCropPlanningRequest(request: CropPlanningRequest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Basic required field validation
    if (!request.farmName?.trim()) {
      errors.push(new ValidationError('Farm name is required', { field: 'farmName' }));
    }

    if (!request.farmId?.trim()) {
      errors.push(new ValidationError('Farm ID is required', { field: 'farmId' }));
    }

    if (!request.cropType?.trim()) {
      errors.push(new ValidationError('Crop type is required', { field: 'cropType' }));
    }

    // Farm size validation
    if (typeof request.farmSize !== 'number') {
      errors.push(new ValidationError('Farm size must be a number', { field: 'farmSize' }));
    } else {
      if (request.farmSize < VALIDATION_CONSTANTS.FARM_SIZE.MIN) {
        errors.push(new ValidationError(
          `Farm size must be at least ${VALIDATION_CONSTANTS.FARM_SIZE.MIN} hectares`,
          { field: 'farmSize', value: request.farmSize }
        ));
      }
      
      if (request.farmSize > VALIDATION_CONSTANTS.FARM_SIZE.MAX) {
        errors.push(new ValidationError(
          `Farm size cannot exceed ${VALIDATION_CONSTANTS.FARM_SIZE.MAX} hectares`,
          { field: 'farmSize', value: request.farmSize }
        ));
      }

      if (request.farmSize > 1000) {
        warnings.push('Large farm size detected - ensure adequate resources for management');
      }
    }

    // Location validation
    if (!request.location) {
      errors.push(new ValidationError('Location is required', { field: 'location' }));
    } else {
      const { lat, lng } = request.location;
      
      if (typeof lat !== 'number' || lat < VALIDATION_CONSTANTS.COORDINATES.LAT.MIN || lat > VALIDATION_CONSTANTS.COORDINATES.LAT.MAX) {
        errors.push(new ValidationError(
          'Invalid latitude - must be between -90 and 90',
          { field: 'location.lat', value: lat }
        ));
      }
      
      if (typeof lng !== 'number' || lng < VALIDATION_CONSTANTS.COORDINATES.LNG.MIN || lng > VALIDATION_CONSTANTS.COORDINATES.LNG.MAX) {
        errors.push(new ValidationError(
          'Invalid longitude - must be between -180 and 180',
          { field: 'location.lng', value: lng }
        ));
      }
    }

    // Crop type validation
    if (request.cropType && !VALIDATION_CONSTANTS.CROP_TYPES.includes(request.cropType.toLowerCase())) {
      warnings.push(`Uncommon crop type detected: ${request.cropType}. Analysis may be limited.`);
    }

    // Optional field validation
    if (request.soilType && !VALIDATION_CONSTANTS.SOIL_TYPES.includes(request.soilType.toLowerCase())) {
      warnings.push(`Unknown soil type: ${request.soilType}. Using general recommendations.`);
    }

    if (request.irrigationSystem && !VALIDATION_CONSTANTS.IRRIGATION_SYSTEMS.includes(request.irrigationSystem.toLowerCase())) {
      warnings.push(`Unknown irrigation system: ${request.irrigationSystem}. Using general recommendations.`);
    }

    if (request.currentSeason && !VALIDATION_CONSTANTS.SEASONS.includes(request.currentSeason.toLowerCase())) {
      warnings.push(`Unknown season: ${request.currentSeason}. Using climate data for analysis.`);
    }

    // Planning horizon validation
    if (request.planningHorizon !== undefined) {
      if (typeof request.planningHorizon !== 'number') {
        errors.push(new ValidationError('Planning horizon must be a number', { field: 'planningHorizon' }));
      } else {
        if (request.planningHorizon < VALIDATION_CONSTANTS.PLANNING_HORIZON.MIN) {
          errors.push(new ValidationError(
            `Planning horizon must be at least ${VALIDATION_CONSTANTS.PLANNING_HORIZON.MIN} month`,
            { field: 'planningHorizon', value: request.planningHorizon }
          ));
        }
        
        if (request.planningHorizon > VALIDATION_CONSTANTS.PLANNING_HORIZON.MAX) {
          errors.push(new ValidationError(
            `Planning horizon cannot exceed ${VALIDATION_CONSTANTS.PLANNING_HORIZON.MAX} months`,
            { field: 'planningHorizon', value: request.planningHorizon }
          ));
        }

        if (request.planningHorizon > 24) {
          warnings.push('Long-term planning horizon detected - predictions may be less accurate');
        }
      }
    }

    // Preferences validation
    if (request.preferences) {
      const { riskTolerance, profitPriority, organicFarming } = request.preferences;
      
      if (riskTolerance && !VALIDATION_CONSTANTS.RISK_TOLERANCE.includes(riskTolerance)) {
        errors.push(new ValidationError(
          'Invalid risk tolerance - must be low, medium, or high',
          { field: 'preferences.riskTolerance', value: riskTolerance }
        ));
      }
      
      if (profitPriority && !VALIDATION_CONSTANTS.PROFIT_PRIORITY.includes(profitPriority)) {
        errors.push(new ValidationError(
          'Invalid profit priority - must be maximum, stable, or sustainable',
          { field: 'preferences.profitPriority', value: profitPriority }
        ));
      }
      
      if (typeof organicFarming !== 'boolean' && organicFarming !== undefined) {
        errors.push(new ValidationError(
          'Organic farming preference must be boolean',
          { field: 'preferences.organicFarming', value: organicFarming }
        ));
      }

      // Business logic validation for preferences
      if (riskTolerance === 'low' && profitPriority === 'maximum') {
        warnings.push('Low risk tolerance with maximum profit priority may limit opportunities');
      }

      if (organicFarming && request.cropType) {
        const organicChallenges = ['corn', 'cotton', 'soybeans'];
        if (organicChallenges.includes(request.cropType.toLowerCase())) {
          warnings.push(`Organic farming for ${request.cropType} may present additional challenges`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate farm ID format and existence
   */
  static validateFarmId(farmId: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!farmId?.trim()) {
      errors.push(new ValidationError('Farm ID is required', { field: 'farmId' }));
      return { isValid: false, errors, warnings };
    }

    // Farm ID format validation (assuming UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(farmId)) {
      errors.push(new ValidationError(
        'Farm ID must be a valid UUID format',
        { field: 'farmId', value: farmId, expected: 'UUID format' }
      ));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate geographic coordinates
   */
  static validateCoordinates(lat: number, lng: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      errors.push(new ValidationError('Coordinates must be numbers', { lat, lng }));
      return { isValid: false, errors, warnings };
    }

    if (lat < -90 || lat > 90) {
      errors.push(new ValidationError(
        'Latitude must be between -90 and 90',
        { field: 'latitude', value: lat }
      ));
    }

    if (lng < -180 || lng > 180) {
      errors.push(new ValidationError(
        'Longitude must be between -180 and 180',
        { field: 'longitude', value: lng }
      ));
    }

    // Check for common coordinate mistakes
    if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) {
      warnings.push('Coordinates very close to 0,0 - verify location accuracy');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate date ranges and seasons
   */
  static validateDateRange(startDate: string, endDate: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime())) {
      errors.push(new ValidationError('Invalid start date format', { startDate }));
    }

    if (isNaN(end.getTime())) {
      errors.push(new ValidationError('Invalid end date format', { endDate }));
    }

    if (errors.length === 0) {
      if (start >= end) {
        errors.push(new ValidationError(
          'Start date must be before end date',
          { startDate, endDate }
        ));
      }

      if (start < new Date('2020-01-01')) {
        warnings.push('Very old start date - data may be limited');
      }

      if (end > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) {
        warnings.push('End date more than 1 year in future - predictions may be uncertain');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate business logic compatibility
   */
  static validateBusinessLogic(request: CropPlanningRequest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check crop-season compatibility
    if (request.cropType && request.currentSeason) {
      const springCrops = ['corn', 'soybeans', 'tomatoes', 'peppers'];
      const fallCrops = ['winter wheat', 'cabbage', 'spinach'];
      
      if (request.currentSeason === 'winter' && springCrops.includes(request.cropType.toLowerCase())) {
        warnings.push(`${request.cropType} is typically planted in spring, not winter`);
      }
      
      if (request.currentSeason === 'summer' && fallCrops.includes(request.cropType.toLowerCase())) {
        warnings.push(`${request.cropType} is typically planted in fall, not summer`);
      }
    }

    // Check farm size vs crop type compatibility
    if (request.farmSize && request.cropType) {
      const largeFarmCrops = ['corn', 'soybeans', 'wheat', 'cotton'];
      const smallFarmCrops = ['tomatoes', 'peppers', 'herbs', 'berries'];
      
      if (request.farmSize > 500 && smallFarmCrops.includes(request.cropType.toLowerCase())) {
        warnings.push(`Large farm size may not be optimal for ${request.cropType} production`);
      }
      
      if (request.farmSize < 5 && largeFarmCrops.includes(request.cropType.toLowerCase())) {
        warnings.push(`Small farm size may limit profitability for ${request.cropType}`);
      }
    }

    // Check organic vs irrigation compatibility
    if (request.preferences?.organicFarming && request.irrigationSystem === 'flood') {
      warnings.push('Flood irrigation may complicate organic certification requirements');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Batch validation utility
 */
export class BatchValidator {
  static validateAll(request: CropPlanningRequest): ValidationResult {
    const results = [
      CropPlanningValidator.validateCropPlanningRequest(request),
      CropPlanningValidator.validateBusinessLogic(request)
    ];

    if (request.location) {
      results.push(CropPlanningValidator.validateCoordinates(request.location.lat, request.location.lng));
    }

    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }
}
