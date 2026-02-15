#!/bin/bash

# Start the False Alarm Classifier ML Service

echo "🚀 Starting False Alarm Classifier..."

# Check if model exists
if [ ! -f "false_alarm_model.pkl" ]; then
    echo "⚠️  Model not found. Training model first..."
    python train_model.py
fi

echo "Starting API server..."
python api.py
