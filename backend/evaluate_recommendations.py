
import pandas as pd

from app.services.recommendation_engine import generate_recommendations

from pathlib import Path

DATASET_PATH = (
    Path(__file__).resolve().parent.parent
    / "C:\\Users\\Prateek\\Downloads\\mindblaze_synthetic_recommendations_1000.csv"
)

df = pd.read_csv(DATASET_PATH)

factor_columns = {
    "workload": "workload_factor_score",
    "work_duration": "work_duration_factor_score",
    "interruptions": "interruptions_factor_score",
    "insufficient_breaks": "insufficient_breaks_factor_score",
}

weights = {
    "workload": 0.35,
    "work_duration": 0.30,
    "interruptions": 0.20,
    "insufficient_breaks": 0.15,
}

results = []

for _, row in df.iterrows():
    factors = {
        key: float(row[column])
        for key, column in factor_columns.items()
    }

    contributions = {
        key: factors[key] * weights[key]
        for key in factors
    }

    recommendations = generate_recommendations(
        factors=factors,
        weighted_contributions=contributions,
        limit=3,
    )

    results.append({
        "synthetic_user_id": row["synthetic_user_id"],
        "fatigue_score": row["fatigue_score_0to100_heuristic"],
        "recommendation_count": len(recommendations),
        "primary_recommendation": recommendations[0]["action"],
        "recommended_factors": "|".join(
            item["factor"] for item in recommendations
        ),
    })

output = pd.DataFrame(results)
output.to_csv(
    "recommendation_evaluation_results.csv",
    index=False,
)


# Recommendation quality checks
print("\n--- Recommendation Quality Checks ---")

# 1. Every profile should have between 1 and 3 recommendations.
valid_counts = output["recommendation_count"].between(1, 3)
print(f"Valid recommendation counts: {valid_counts.sum()}/{len(output)}")

# 2. Check for missing primary recommendations.
valid_primary = (
    output["primary_recommendation"].notna()
    & output["primary_recommendation"].ne("")
)
print(f"Profiles with a primary recommendation: {valid_primary.sum()}/{len(output)}")

# 3. Check for duplicate synthetic user IDs.
unique_ids = output["synthetic_user_id"].nunique()
print(f"Unique profile IDs: {unique_ids}/{len(output)}")

# 4. Check for duplicate recommendations within a profile.
def has_duplicate_recommendations(value):
    actions = str(value).split("|")
    return len(actions) != len(set(actions))

duplicates = output["recommended_factors"].apply(
    has_duplicate_recommendations
)
print(f"Profiles with duplicate factor recommendations: {duplicates.sum()}")

# 5. Check the distribution of primary recommendations.
print("\nPrimary recommendation distribution:")
print(output["primary_recommendation"].value_counts())

# 6. Check for missing values in the evaluation output.
print("\nMissing values by column:")
print(output.isna().sum())

# Save the quality-check results.
output.to_csv("recommendation_evaluation_results.csv", index=False)
print("\nUpdated evaluation file saved.")


print("Synthetic profiles evaluated:", len(output))
print("\nPrimary recommendation distribution:")
print(output["primary_recommendation"].value_counts())

print("\nRecommendation count distribution:")
print(output["recommendation_count"].value_counts().sort_index())

print("\nSaved: recommendation_evaluation_results.csv")
