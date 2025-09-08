# Crop Yield Prediction AI Service

## Overview
The Crop Yield Prediction service is an advanced AI-powered feature that analyzes comprehensive farm data to predict crop yields. It combines historical plant health data, soil analysis, weather patterns, and pest reports to generate accurate yield forecasts.

## Features

### 🌾 Comprehensive Data Analysis
- **Plant Health Trends**: Analyzes historical plant scans and health diagnostics
- **Soil Quality Assessment**: Evaluates soil fertility, pH, moisture, and nutrient trends
- **Weather Impact**: Considers seasonal weather patterns and environmental factors
- **Pest Pressure**: Factors in pest and disease reports and their impact on yield

### 🤖 AI-Powered Predictions
- **OpenAI Integration**: Uses GPT-4 for intelligent yield analysis
- **Confidence Scoring**: Provides confidence levels based on data quality and trends
- **Quality Grading**: Predicts both yield quantity and quality grade
- **Risk Assessment**: Identifies potential risks and mitigation strategies

### 📊 Detailed Predictions Include
- **Predicted Yield**: Amount and unit (kg, bushels, etc.)
- **Quality Grade**: Premium, Standard, or Below Average
- **Harvest Window**: Optimal, earliest, and latest harvest dates
- **Factor Analysis**: Detailed breakdown of soil, plant, weather, and pest factors
- **Recommendations**: AI-generated actionable recommendations
- **Risk Factors**: Identified risks and mitigation strategies

## API Endpoints

### Generate Yield Prediction
```
POST /api/predict-yield
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "farmName": "Green Valley Farm",
  "cropType": "tomato",
  "farmSize": 2.5,
  "plantingDate": "2024-03-15T00:00:00.000Z",
  "expectedHarvestDate": "2024-07-20T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": "Yield prediction generated successfully",
  "prediction": {
    "cropType": "tomato",
    "farmName": "Green Valley Farm",
    "predictedYield": {
      "amount": 112500,
      "unit": "kg",
      "confidence": 85
    },
    "yieldQuality": {
      "grade": "Premium",
      "qualityScore": 88
    },
    "factors": {
      "soilHealth": {
        "score": 92,
        "impact": "Excellent soil conditions supporting high yield",
        "trends": ["Improving fertility", "Stable pH levels"]
      },
      "plantHealth": {
        "score": 87,
        "impact": "Strong plant health with minimal disease pressure",
        "diseases": [],
        "trends": ["Consistent growth", "Good disease resistance"]
      },
      "weatherConditions": {
        "score": 82,
        "impact": "Favorable growing conditions",
        "favorableFactors": ["Adequate rainfall", "Optimal temperature range"],
        "riskFactors": ["Possible late season heat stress"]
      },
      "pestPressure": {
        "score": 90,
        "impact": "Low pest pressure",
        "threats": ["Minor aphid activity"]
      }
    },
    "recommendations": [
      "Monitor for heat stress during late season",
      "Continue current irrigation schedule",
      "Apply preventive pest management"
    ],
    "risks": {
      "level": "Low",
      "factors": ["Weather variability"],
      "mitigation": ["Install shade cloth if needed", "Monitor soil moisture"]
    },
    "confidence": {
      "overall": 85,
      "dataQuality": "Good"
    },
    "generatedAt": "2024-06-15T10:30:00.000Z",
    "harvestWindow": {
      "optimal": "2024-07-20T00:00:00.000Z",
      "earliest": "2024-07-15T00:00:00.000Z",
      "latest": "2024-07-25T00:00:00.000Z"
    }
  }
}
```

### Get Recent Predictions
```
GET /api/yield-predictions/{farmName}/{cropType}?limit=5
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": "Recent yield predictions retrieved successfully",
  "predictions": [
    {
      "id": "pred_xyz123",
      "cropType": "tomato",
      "predictedAmount": 112500,
      "yieldUnit": "kg",
      "confidence": 85,
      "qualityGrade": "Premium",
      "qualityScore": 88,
      "riskLevel": "Low",
      "overallConfidence": 85,
      "dataQuality": "Good",
      "optimalHarvestDate": "2024-07-20T00:00:00.000Z",
      "createdAt": "2024-06-15T10:30:00.000Z",
      "recommendations": ["Monitor for heat stress", "Continue irrigation"],
      "riskFactors": ["Weather variability"]
    }
  ]
}
```

## Supported Crops

The service includes optimized yield standards for:
- **Tomato**: kg per hectare (45,000 avg, 55,000 premium)
- **Corn**: bushels per hectare (180 avg, 220 premium)
- **Wheat**: bushels per hectare (50 avg, 65 premium)
- **Rice**: kg per hectare (4,500 avg, 6,000 premium)
- **Soybean**: bushels per hectare (45 avg, 60 premium)
- **Potato**: kg per hectare (40,000 avg, 50,000 premium)
- **Lettuce**: kg per hectare (25,000 avg, 35,000 premium)
- **Carrot**: kg per hectare (35,000 avg, 45,000 premium)
- **Onion**: kg per hectare (30,000 avg, 40,000 premium)
- **Pepper**: kg per hectare (20,000 avg, 28,000 premium)

## Data Requirements

### Optimal Predictions Require:
- **Historical Plant Scans**: At least 3-5 scans showing plant health trends
- **Soil Analysis**: Recent soil readings with nutrient and pH data
- **Pest Reports**: Any pest or disease incidents recorded
- **Farm Information**: Accurate farm size and planting dates

### Minimum Data:
- Farm name and crop type (basic prediction with lower confidence)
- At least one plant scan or soil reading for improved accuracy

## Confidence Scoring

- **90-100%**: Excellent historical data, clear trends, minimal risks
- **70-89%**: Good data quality, manageable risks, reliable prediction
- **50-69%**: Limited data, moderate uncertainty, fair prediction
- **Below 50%**: Poor data quality, high uncertainty, use with caution

## Technical Architecture

### Services Used:
- **YieldPredictionService**: Core prediction logic
- **OpenAI GPT-4**: AI analysis and prediction generation
- **Neo4j/Memgraph**: Historical data aggregation
- **PlantData Service**: Plant health trend analysis
- **SoilAnalysisService**: Soil condition evaluation
- **WeatherService**: Environmental factor analysis

### Database Schema:
```cypher
// Yield Prediction Node
(:YieldPrediction {
  id: string,
  cropType: string,
  predictedAmount: number,
  yieldUnit: string,
  confidence: number,
  qualityGrade: string,
  qualityScore: number,
  riskLevel: string,
  createdAt: datetime,
  optimalHarvestDate: datetime,
  recommendations: [string],
  // ... additional properties
})

// Relationships
(:Farm)-[:HAS_YIELD_PREDICTION]->(:YieldPrediction)
```

## Usage Examples

### Basic Prediction
```javascript
const prediction = await YieldPredictionRunner.generatePrediction(token, {
  farmName: "My Farm",
  cropType: "tomato",
  farmSize: 1.0
});
```

### Detailed Prediction with Dates
```javascript
const prediction = await YieldPredictionRunner.generatePrediction(token, {
  farmName: "Commercial Farm",
  cropType: "corn",
  farmSize: 50.0,
  plantingDate: "2024-04-01T00:00:00.000Z",
  expectedHarvestDate: "2024-09-15T00:00:00.000Z"
});
```

## Future Enhancements

- **Satellite Data Integration**: Include satellite imagery for field analysis
- **Weather API Integration**: Real-time weather data and forecasts
- **Machine Learning Models**: Custom ML models trained on farm-specific data
- **Market Price Integration**: Include market price predictions for profitability analysis
- **Multi-Season Analysis**: Compare predictions across multiple growing seasons
- **Automated Alerts**: Proactive notifications when conditions change
