from app.models.random_forest import predict_usage

def analyze_regions(region_data):
    for region in region_data:
        region["anomaly"] = predict_usage(region["usage"])
    return region_data
