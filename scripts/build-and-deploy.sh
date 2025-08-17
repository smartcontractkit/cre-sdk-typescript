#!/bin/bash

# Check if arguments are provided
if [ $# -eq 0 ]; then
    echo "Error: Workflow name is required"
    echo "Usage: $0 <workflow_name>"
    echo "       $0 <directory> <workflow_name>"
    echo "Examples:"
    echo "  Single: $0 capability_calls_are_async"
    echo "  Nested: $0 mode_switch don_runtime_in_node_mode"
    exit 1
fi

if [ $# -eq 1 ]; then
    # Single workflow
    workflow_name=$1
    echo "Building and deploying workflow: $workflow_name"
    
    # Step 1: Build JavaScript workflow
    echo "Building JavaScript workflow..."
    bun build:workflow:single:js "$workflow_name"
    
    # Check if the previous command was successful
    if [ $? -ne 0 ]; then
        echo "Error: JavaScript build failed"
        exit 1
    fi
    
    # Step 2: Build WASM workflow
    echo "Building WASM workflow..."
    bun build:workflow:single:wasm "$workflow_name"
    
    # Check if the previous command was successful
    if [ $? -ne 0 ]; then
        echo "Error: WASM build failed"
        exit 1
    fi
    
    # Step 3: Copy WASM files
    echo "Copying WASM files..."
    ./scripts/copy-wasm.sh "$workflow_name"
    
    # Check if the previous command was successful
    if [ $? -ne 0 ]; then
        echo "Error: WASM copy failed"
        exit 1
    fi
    
    echo "Build and deploy completed successfully for workflow: $workflow_name"
    
elif [ $# -eq 2 ]; then
    # Nested workflow
    directory=$1
    workflow_name=$2
    echo "Building and deploying nested workflow: $directory/$workflow_name"
    
    # Step 1: Build JavaScript workflow
    echo "Building JavaScript workflow..."
    bun build:workflow:single:js "$directory" "$workflow_name"
    
    # Check if the previous command was successful
    if [ $? -ne 0 ]; then
        echo "Error: JavaScript build failed"
        exit 1
    fi
    
    # Step 2: Build WASM workflow
    echo "Building WASM workflow..."
    bun build:workflow:single:wasm "$directory" "$workflow_name"
    
    # Check if the previous command was successful
    if [ $? -ne 0 ]; then
        echo "Error: WASM build failed"
        exit 1
    fi
    
    # Step 3: Copy WASM files
    echo "Copying WASM files..."
    ./scripts/copy-nested-wasm.sh "$directory" "$workflow_name"
    
    # Check if the previous command was successful
    if [ $? -ne 0 ]; then
        echo "Error: WASM copy failed"
        exit 1
    fi
    
    echo "Build and deploy completed successfully for nested workflow: $directory/$workflow_name"
    
else
    echo "Error: Too many arguments provided"
    echo "Usage: $0 <workflow_name>"
    echo "       $0 <directory> <workflow_name>"
    exit 1
fi

