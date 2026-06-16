import cv2
from inference import get_model

# 1. Initialize your custom Roboflow model
# Ensure your API key is correctly pasted here.
model = get_model(model_id="cats-behaviors-test-ygn1v/1", api_key="tUdAqaYL4CSRkjNZ48vn")

# 2. Open your computer's webcam (0 is usually the built-in laptop camera)
camera = cv2.VideoCapture(0)

print("🐾 PawCare AI is active... Press 'q' on your keyboard to exit.")

while True:
    ret, frame = camera.read()
    if not ret:
        print("Failed to grab frame from camera.")
        break

    # 3. Run inference LOCALLY on the live video frame
    results = model.infer(frame)[0]

    # 4. Check for cat behaviors using the updated object syntax
    for prediction in results.predictions:
        # Use dot notation to access properties on the prediction object
        behavior = prediction.class_name       # sitting, standing, or lying
        confidence = prediction.confidence     # how sure the AI is
        
        print(f"Cat Detected: {behavior} ({confidence:.2%})")
        
        # --- YOUR AUTOMATION LOGIC ---
        if behavior == "standing":
            # Example: code to trigger a smart feeder or alert goes here
            pass 

    # 5. Display the live video feed window
    cv2.imshow("PawCare AI - Live Tracking", frame)
    
    # Press 'q' to quit the window
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup when done
camera.release()
cv2.destroyAllWindows()