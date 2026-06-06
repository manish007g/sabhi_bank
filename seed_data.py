#!/usr/bin/env python3
"""
Seed script to populate dummy accounts and transactions for testing.
Run this after the stack is up: python seed_data.py
"""

import requests
import json
import time
from random import randint, choice

# Service URLs
GATEWAY_URL = "http://localhost:8000"
AUTH_API = f"{GATEWAY_URL}/proxy/auth"
ACCOUNTS_API = f"{GATEWAY_URL}/proxy/accounts"
TRANSACTIONS_API = f"{GATEWAY_URL}/proxy/transactions"

# Sample data
USERS = [
    {"username": "alice", "password": "alice123", "email": "alice@bank.com", "full_name": "Alice Johnson"},
    {"username": "bob", "password": "bob123", "email": "bob@bank.com", "full_name": "Bob Smith"},
    {"username": "charlie", "password": "charlie123", "email": "charlie@bank.com", "full_name": "Charlie Brown"},
]

ACCOUNT_TYPES = ["savings", "checking"]
INITIAL_BALANCES = [5000.00, 10000.00, 25000.00, 50000.00]

def seed_users():
    """Register users and get their user_ids"""
    users_data = {}
    for user in USERS:
        try:
            response = requests.post(f"{AUTH_API}/login", json={
                "username": user["username"],
                "password": user["password"]
            })
            if response.status_code == 200:
                token = response.json()["access_token"]
                # Get user_id from token or use a simple lookup
                print(f"✓ User {user['username']} logged in")
                users_data[user["username"]] = {
                    "token": token,
                    "password": user["password"],
                    "email": user["email"],
                    "full_name": user["full_name"]
                }
            else:
                print(f"✗ Failed to create user {user['username']}: {response.text}")
        except Exception as e:
            print(f"✗ Error with user {user['username']}: {e}")
    return users_data

def seed_accounts(users_data):
    """Create accounts for each user"""
    accounts = {}
    user_id = 1
    for username, user_info in users_data.items():
        for _ in range(2):  # Create 2 accounts per user
            account_type = choice(ACCOUNT_TYPES)
            initial_deposit = choice(INITIAL_BALANCES)
            try:
                response = requests.post(f"{ACCOUNTS_API}/", json={
                    "user_id": user_id,
                    "account_type": account_type,
                    "initial_deposit": initial_deposit
                })
                if response.status_code == 200:
                    account = response.json()
                    accounts[account["account_number"]] = {
                        "user_id": user_id,
                        "username": username,
                        "account_type": account_type,
                        "balance": initial_deposit
                    }
                    print(f"✓ Created {account_type} account {account['account_number']} for {username} with balance ${initial_deposit}")
                else:
                    print(f"✗ Failed to create account for {username}: {response.text}")
            except Exception as e:
                print(f"✗ Error creating account for {username}: {e}")
        user_id += 1
    return accounts

def seed_transactions(accounts):
    """Create sample transactions"""
    account_numbers = list(accounts.keys())
    if len(account_numbers) < 2:
        print("⚠ Need at least 2 accounts for transfers")
        return
    
    # Deposits
    for account_num in account_numbers[:2]:
        try:
            response = requests.post(f"{TRANSACTIONS_API}/transactions", json={
                "to_account": account_num,
                "amount": 500.00,
                "type": "deposit"
            })
            if response.status_code == 200:
                print(f"✓ Deposit of $500 to account {account_num}")
            else:
                print(f"✗ Deposit failed for {account_num}: {response.text}")
        except Exception as e:
            print(f"✗ Error depositing to {account_num}: {e}")
    
    # Withdrawals
    for account_num in account_numbers[1:3]:
        try:
            response = requests.post(f"{TRANSACTIONS_API}/transactions", json={
                "from_account": account_num,
                "amount": 200.00,
                "type": "withdraw"
            })
            if response.status_code == 200:
                print(f"✓ Withdrawal of $200 from account {account_num}")
            else:
                print(f"✗ Withdrawal failed for {account_num}: {response.text}")
        except Exception as e:
            print(f"✗ Error withdrawing from {account_num}: {e}")
    
    # Transfers
    if len(account_numbers) >= 2:
        from_account = account_numbers[0]
        to_account = account_numbers[1]
        try:
            response = requests.post(f"{TRANSACTIONS_API}/transactions", json={
                "from_account": from_account,
                "to_account": to_account,
                "amount": 1000.00,
                "type": "transfer"
            })
            if response.status_code == 200:
                print(f"✓ Transfer of $1000 from {from_account} to {to_account}")
            else:
                print(f"✗ Transfer failed: {response.text}")
        except Exception as e:
            print(f"✗ Error during transfer: {e}")

def main():
    print("=" * 60)
    print("Sabhi Bank - Seed Data Population")
    print("=" * 60)
    
    print("\n[1/3] Registering users...")
    users_data = seed_users()
    time.sleep(1)
    
    print("\n[2/3] Creating accounts...")
    accounts = seed_accounts(users_data)
    time.sleep(1)
    
    print("\n[3/3] Creating sample transactions...")
    seed_transactions(accounts)
    
    print("\n" + "=" * 60)
    print("✓ Seed data population complete!")
    print("=" * 60)
    print("\nSample Users:")
    for user in USERS:
        print(f"  - {user['username']} / {user['password']}")
    print("\nYou can now login with these credentials in the frontend.")

if __name__ == "__main__":
    main()
