from supabase import create_client, Client
from .config import settings


class Database:
    """Singleton Supabase client."""

    _client: Client | None = None

    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client instance."""
        if cls._client is None:
            cls._client = create_client(
                settings.supabase_url, settings.supabase_key
            )
        return cls._client


def get_db() -> Client:
    """Dependency for getting database client."""
    return Database.get_client()
