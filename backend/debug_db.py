import asyncio
from app.database import init_db

async def main():
    print("Initializing DB...")
    try:
        await init_db()
        print("DB Initialized successfully.")
    except Exception:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
