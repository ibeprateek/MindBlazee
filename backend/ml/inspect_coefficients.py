
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, Ridge

# Load the cleaned survey dataset
data = pd.read_csv("data/mindblaze_fatigue_cleaned_initial.csv")

target = pd.to_numeric(
    data["fatigue_rating_0_to_10"], errors="coerce"
)

features = data[
    [
        "work_hours",
        "interruption_count",
        "pending_task_minutes",
        "task_difficulty_1_to_5",
        "sleep_hours",
        "activity_type",
    ]
].copy()

features["activity_type"] = features["activity_type"].fillna("Unknown")

valid = target.notna() & target.between(0, 10)
X = features.loc[valid].copy()
y = target.loc[valid].copy()

numeric_features = [
    "work_hours",
    "interruption_count",
    "pending_task_minutes",
    "task_difficulty_1_to_5",
    "sleep_hours",
]

categorical_features = ["activity_type"]

preprocessor = ColumnTransformer(
    transformers=[
        (
            "num",
            make_pipeline(
                SimpleImputer(strategy="median"),
                StandardScaler(),
            ),
            numeric_features,
        ),
        (
            "cat",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features,
        ),
    ]
)

models = [
    ("Linear Regression", LinearRegression()),
    ("Ridge Regression", Ridge(alpha=1)),
]

for name, model in models:
    pipeline = make_pipeline(preprocessor, model)
    pipeline.fit(X, y)

    fitted_preprocessor = pipeline.named_steps["columntransformer"]
    fitted_model = pipeline.named_steps[
        "linearregression" if name == "Linear Regression" else "ridge"
    ]

    feature_names = fitted_preprocessor.get_feature_names_out()
    coefficients = pd.Series(
        fitted_model.coef_,
        index=feature_names,
    )

    print(f"\n{name} — coefficient inspection")
    print(coefficients.sort_values(key=abs, ascending=False).to_string())
    print(f"Intercept: {fitted_model.intercept_:.3f}")

print(f"\nValid observations: {len(X)}")
print("Note: coefficients are exploratory, not causal evidence.")
