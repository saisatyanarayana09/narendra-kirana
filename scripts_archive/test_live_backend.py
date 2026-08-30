import requests

url = "https://narendra-kirana.onrender.com/api/v1/products/analyze_image/"

try:
    print("Sending OPTIONS request...")
    options_res = requests.options(url)
    print("OPTIONS Status:", options_res.status_code)
    print("OPTIONS Headers:", options_res.headers)

    print("\nSending POST request...")
    # Send a tiny dummy file to avoid 413
    files = {'imageFront': ('dummy.jpg', b'dummy_data', 'image/jpeg')}
    post_res = requests.post(url, files=files)
    print("POST Status:", post_res.status_code)
    print("POST Text:", post_res.text[:200])
except Exception as e:
    print("Request failed:", e)
