import joblib

# Load the trained model
model = joblib.load("relapse_predictor.pkl")

# Custom input: [heart_rate, hrv, sleep_score, steps, temperature, spo2, stress]
#input_data = [[85, 30, 50, 2000, 37.5, 94, 85]]
input_data = [[25, 95, 40, 6500, 37.8, 90, 90.79]]
#input_data =[[73.7, 49.4, 64.8, 4173.8, 36.84, 95.3, 59.4]]
#input_data = [[73.74737484118825, 49.40152493739601, 64.87995496144896, 4173.803589287694, 36.84315657079732, 95.30901336287347, 59.435641654419214]]
#input_data =[[82.9802849180674, 34.03214989180171, 66.47688538100692, 4023.029856408026, 37.229753987583, 93.7658630430508, 59.97]]
# Predict
# Predict the class and the probability distribution for each class
prediction = model.predict(input_data)[0]
probabilities = model.predict_proba(input_data)[0]

# Output result
labels = [" Stable condition", "Possible early signs", "High chance of relapse"]
print(f" Raw prediction (class): {prediction}")
print(f" Probability distribution: {probabilities}")

# Get the highest class probability for output
max_prob_class = probabilities.argmax()  # This gives you the index of the highest probability
print(f" Result: {labels[max_prob_class]} with {round(probabilities[max_prob_class] * 100, 2)}% confidence.")
