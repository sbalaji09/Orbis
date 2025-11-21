from setuptools import setup, find_packages

setup(
    name="orbis-sdk",
    version="0.1.0",
    description="AI Observability SDK for Production Agents",
    author="Orbis",
    author_email="support@orbis.dev",
    url="https://github.com/orbis/orbis-sdk",
    packages=find_packages(exclude=["tests", "testing", "*.tests", "*.testing"]),
    install_requires=[
        "requests>=2.31.0",  # Required for HTTP requests to backend
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
        ],
        "openai": ["openai>=1.0.0"],
        "anthropic": ["anthropic>=0.18.0"],
        "gemini": ["google-genai>=0.1.0"],
        "langchain": [
            "langchain>=0.1.0",
            "langchain-core>=0.1.0",
            "langchain-community>=0.0.20",
        ],
        "all": [
            "openai>=1.0.0",
            "anthropic>=0.18.0",
            "google-genai>=0.1.0",
            "langchain>=0.1.0",
            "langchain-core>=0.1.0",
            "langchain-community>=0.0.20",
        ],
    },
    python_requires=">=3.9",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)