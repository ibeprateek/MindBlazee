
import pandas as pd

path = "data/mindblaze_fatigue_cleaned_initial.csv"
df = pd.read_csv(path)

df["fatigue_rating_0_to_10"] = pd.to_numeric(
    df["fatigue_rating_0_to_10"], errors="coerce"
)

df = df[
    df["fatigue_rating_0_to_10"].between(0, 10)
].copy()

summary = (
    df.groupby("activity_type", dropna=False)
    .agg(
        participants=("fatigue_rating_0_to_10", "count"),
        mean_fatigue=("fatigue_rating_0_to_10", "mean"),
        median_fatigue=("fatigue_rating_0_to_10", "median"),
        minimum_fatigue=("fatigue_rating_0_to_10", "min"),
        maximum_fatigue=("fatigue_rating_0_to_10", "max"),
    )
    .round(2)
    .sort_values("participants", ascending=False)
)

print(summary.to_string())
