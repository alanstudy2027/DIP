#!/usr/bin/env python3
"""
Test script for concurrent processing optimization.
This script makes multiple simultaneous requests to verify thread-safe database access.
"""

import requests
import concurrent.futures
import time
import json

BASE_URL = "http://localhost:8080"

def test_concurrent_list_documents(thread_id):
    """Test concurrent document listing"""
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/documents/")
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            return {
                "thread_id": thread_id,
                "status": "success",
                "elapsed": elapsed,
                "document_count": data.get("total_processed", 0)
            }
        else:
            return {
                "thread_id": thread_id,
                "status": "error",
                "elapsed": elapsed,
                "error": response.text
            }
    except Exception as e:
        return {
            "thread_id": thread_id,
            "status": "exception",
            "error": str(e)
        }

def test_concurrent_versions(thread_id):
    """Test concurrent version history requests"""
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/documents-with-versions/")
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            return {
                "thread_id": thread_id,
                "status": "success",
                "elapsed": elapsed,
                "document_count": len(data.get("documents", []))
            }
        else:
            return {
                "thread_id": thread_id,
                "status": "error",
                "elapsed": elapsed,
                "error": response.text
            }
    except Exception as e:
        return {
            "thread_id": thread_id,
            "status": "exception",
            "error": str(e)
        }

def run_concurrent_test(test_func, num_threads=5, test_name="Test"):
    """Run a test function concurrently with multiple threads"""
    print(f"\n{'='*60}")
    print(f"{test_name}")
    print(f"{'='*60}")
    print(f"Running {num_threads} concurrent requests...")
    
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(test_func, i) for i in range(num_threads)]
        results = [future.result() for future in concurrent.futures.as_completed(futures)]
    
    total_time = time.time() - start_time
    
    # Print results
    print(f"\nResults:")
    for result in sorted(results, key=lambda x: x['thread_id']):
        status = result['status']
        thread_id = result['thread_id']
        elapsed = result.get('elapsed', 0)
        
        if status == 'success':
            doc_count = result.get('document_count', 0)
            print(f"  Thread {thread_id}: ✓ SUCCESS ({elapsed:.3f}s) - {doc_count} documents")
        else:
            error = result.get('error', 'Unknown error')
            print(f"  Thread {thread_id}: ✗ FAILED - {error}")
    
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"\nSummary:")
    print(f"  Total time: {total_time:.3f}s")
    print(f"  Success rate: {success_count}/{num_threads}")
    print(f"  Average response time: {sum(r.get('elapsed', 0) for r in results) / len(results):.3f}s")
    
    return success_count == num_threads

if __name__ == "__main__":
    print("Backend Concurrent Processing Test")
    print("=" * 60)
    
    # Test 1: Concurrent document listing
    test1_passed = run_concurrent_test(
        test_concurrent_list_documents,
        num_threads=5,
        test_name="Test 1: Concurrent Document Listing"
    )
    
    # Test 2: Concurrent version history requests
    test2_passed = run_concurrent_test(
        test_concurrent_versions,
        num_threads=5,
        test_name="Test 2: Concurrent Version History Requests"
    )
    
    # Test 3: High concurrency test
    test3_passed = run_concurrent_test(
        test_concurrent_list_documents,
        num_threads=10,
        test_name="Test 3: High Concurrency (10 threads)"
    )
    
    # Final summary
    print(f"\n{'='*60}")
    print("FINAL RESULTS")
    print(f"{'='*60}")
    print(f"Test 1 (Concurrent Listing): {'✓ PASSED' if test1_passed else '✗ FAILED'}")
    print(f"Test 2 (Concurrent Versions): {'✓ PASSED' if test2_passed else '✗ FAILED'}")
    print(f"Test 3 (High Concurrency): {'✓ PASSED' if test3_passed else '✗ FAILED'}")
    
    if all([test1_passed, test2_passed, test3_passed]):
        print("\n🎉 All tests passed! Concurrent processing is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the backend logs for details.")
