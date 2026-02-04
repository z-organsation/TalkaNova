import sys
try:
    print("Importing app.models_debug...")
    from app import models_debug
    print("Import successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
