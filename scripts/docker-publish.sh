#!/bin/bash
# Script to build and publish Docker image to Docker Hub

# Exit on error
set -e

# Default values
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="salesforce-mcp-ts"
TAG="latest"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --tag|-t)
      TAG="$2"
      shift
      shift
      ;;
    --version|-v)
      VERSION="$2"
      shift
      shift
      ;;
    --username|-u)
      DOCKER_HUB_USERNAME="$2"
      shift
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo "Build and publish Docker image to Docker Hub"
      echo ""
      echo "Options:"
      echo "  --tag, -t         Specify tag (default: latest)"
      echo "  --version, -v     Specify version (default: from package.json)"
      echo "  --username, -u    Docker Hub username"
      echo "  --help, -h        Display this help and exit"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if Docker Hub username is provided
if [ -z "$DOCKER_HUB_USERNAME" ]; then
  echo "Error: Docker Hub username is required."
  echo "Please provide it using --username option or set DOCKER_HUB_USERNAME environment variable."
  exit 1
fi

FULL_IMAGE_NAME="$DOCKER_HUB_USERNAME/$IMAGE_NAME"

echo "Building Docker image $FULL_IMAGE_NAME:$TAG"
echo "Version: $VERSION"

# Build the Docker image
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VCS_URL=$(git config --get remote.origin.url 2>/dev/null || echo "https://github.com/steffensbola/salesforce-mcp-ts")

docker build \
  --build-arg VERSION="$VERSION" \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VCS_REF="$VCS_REF" \
  --build-arg VCS_URL="$VCS_URL" \
  -t "$FULL_IMAGE_NAME:$TAG" \
  -t "$FULL_IMAGE_NAME:$VERSION" \
  .

echo "Docker image built successfully."

# Ask user if they want to push the image
read -p "Do you want to push the image to Docker Hub? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Pushing image to Docker Hub..."
  
  # Check if user is logged in
  if ! docker info | grep -q "Username"; then
    echo "You're not logged in to Docker Hub. Please login:"
    docker login
  fi
  
  # Push the images
  docker push "$FULL_IMAGE_NAME:$TAG"
  docker push "$FULL_IMAGE_NAME:$VERSION"
  
  echo "Image pushed successfully!"
else
  echo "Skipping push to Docker Hub."
  echo "You can push later with:"
  echo "  docker push $FULL_IMAGE_NAME:$TAG"
  echo "  docker push $FULL_IMAGE_NAME:$VERSION"
fi

# Display info about how to run the image
echo ""
echo "To run the image locally:"
echo "  DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME docker-compose up -d"
echo ""
echo "Or:"
echo "  docker run -p 3000:3000 $FULL_IMAGE_NAME:$TAG"
