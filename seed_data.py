#!/usr/bin/env python3
"""
Comprehensive Seed Script for Sabhi Bank.
Populates at least 50+ realistic dummy records for each service.
Requires the Docker Compose stack to be up and running on port 8000.
"""

import requests
import time
import random
from datetime import datetime, timedelta

GATEWAY_URL = "http://localhost:8000"
PROXY_URL = f"{GATEWAY_URL}/proxy"

# Sample Indian names, occupations, cities for realistic dummy data
FIRST_NAMES = [
    "Aarav", "Aditya", "Akash", "Amit", "Ananya", "Arjun", "Bhavna", "Chaitanya", "Deepak", "Divya",
    "Gaurav", "Harish", "Isha", "Jay", "Karan", "Kavita", "Krunal", "Manish", "Meera", "Neha",
    "Nikhil", "Pooja", "Pranav", "Priya", "Rahul", "Riya", "Rohan", "Sanjay", "Shalini", "Siddharth",
    "Sneha", "Sunita", "Tarun", "Umesh", "Varun", "Vikram", "Yash", "Abhishek", "Aishwarya", "Anjali",
    "Dev", "Kiran", "Madhav", "Nisha", "Rajesh", "Sameer", "Swati", "Vivek", "Aditi", "Rakesh"
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Mehta", "Joshi", "Patel", "Shah", "Reddy", "Nair", "Iyer",
    "Kumar", "Singh", "Rao", "Joshi", "Choudhury", "Das", "Sen", "Bose", "Chatterjee", "Banerjee",
    "Mishra", "Pandey", "Tripathi", "Dubey", "Yadav", "Prasad", "Saxena", "Srivastava", "Kapoor", "Khanna"
]

OCCUPATIONS = [
    "Software Engineer", "Doctor", "Teacher", "Chartered Accountant", "Business Owner",
    "Architect", "Civil Servant", "Banker", "Consultant", "Graphic Designer",
    "Marketing Manager", "Journalist", "Student", "Retired", "Lawyer", "Pilot"
]

CITIES = [
    "Mumbai, Maharashtra", "Delhi, NCR", "Bengaluru, Karnataka", "Hyderabad, Telangana",
    "Ahmedabad, Gujarat", "Chennai, Tamil Nadu", "Kolkata, West Bengal", "Pune, Maharashtra",
    "Jaipur, Rajasthan", "Lucknow, Uttar Pradesh", "Patna, Bihar", "Indore, Madhya Pradesh"
]

KYC_STATUSES = ["Approved", "Approved", "Approved", "Approved", "Pending", "Rejected"]
USER_STATUSES = ["Active", "Active", "Active", "Active", "Active", "Suspended"]
ACCOUNT_TYPES = ["savings", "checking"]
TRANSACTION_TYPES = ["deposit", "withdraw", "transfer"]
METRIC_NAMES = [
    "transaction_processing_time_ms", "active_websocket_connections",
    "cpu_utilization_percent", "memory_free_bytes", "http_request_duration_seconds",
    "failed_login_attempts", "card_block_requests", "loan_application_rate"
]

def generate_user(i):
    first = FIRST_NAMES[i % len(FIRST_NAMES)]
    last = LAST_NAMES[(i * 3) % len(LAST_NAMES)]
    username = f"{first.lower()}{last.lower()}{i}"
    full_name = f"{first} {last}"
    email = f"{username}@example.com"
    phone = f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}"
    address = f"{random.randint(10, 500)}, Sector {random.randint(1, 25)}, {random.choice(CITIES)}"
    kyc = random.choice(KYC_STATUSES)
    status = random.choice(USER_STATUSES)
    # Suspended users usually have Rejected KYC
    if status == "Suspended":
        kyc = "Rejected"
    occupation = random.choice(OCCUPATIONS)
    dob = (datetime.now() - timedelta(days=365 * random.randint(22, 60))).strftime("%Y-%m-%d")
    return {
        "username": username,
        "password": f"securePassword{i}!",
        "email": email,
        "full_name": full_name,
        "phone": phone,
        "address": address,
        "kyc_status": kyc,
        "status": status,
        "occupation": occupation,
        "date_of_birth": dob
    }

def main():
    print("=" * 60)
    print("Sabhi Bank - Starting Database Seeding (50+ records)")
    print("=" * 60)
    
    # 1. Register Users
    print("\n[1/8] Seeding Users...")
    users = []
    user_ids = []
    
    # Add default employee user so we can always log in
    default_emp = {
        "username": "employee",
        "password": "password123",
        "email": "employee@sabhibank.com",
        "full_name": "Senior Bank Employee",
        "phone": "+91 99999 88888",
        "address": "Headquarters, Mumbai",
        "kyc_status": "Approved",
        "status": "Active",
        "occupation": "Banker",
        "date_of_birth": "1988-08-08"
    }
    
    try:
        res = requests.post(f"{PROXY_URL}/auth/register", json=default_emp)
        if res.status_code in [200, 400]:
            print("✓ Default employee registered (or already exists)")
    except Exception as e:
        print(f"✗ Failed to connect to auth service: {e}")
        print("Is the Docker Compose stack up?")
        return

    for i in range(1, 56): # Create 55 users
        u = generate_user(i)
        try:
            res = requests.post(f"{PROXY_URL}/auth/register", json=u)
            if res.status_code == 200:
                user_id = res.json()["user_id"]
                u["id"] = user_id
                users.append(u)
                user_ids.append(user_id)
            else:
                # If already exists, we can still query the user later
                print(f"  User {u['username']} already exists or error: {res.text}")
        except Exception as e:
            print(f"  Error creating user {u['username']}: {e}")
    
    print(f"✓ Successfully registered {len(users)} new users.")
    
    if not user_ids:
        # Fallback in case they already existed, fetch existing ones
        print("Fetching existing users to seed accounts...")
        try:
            res = requests.get(f"{PROXY_URL}/auth/users")
            if res.status_code == 200:
                users = res.json()
                user_ids = [u["id"] for u in users]
                print(f"✓ Retrieved {len(user_ids)} existing users.")
        except Exception as e:
            print(f"✗ Failed to fetch existing users: {e}")
            return
            
    # 2. Seed Accounts
    print("\n[2/8] Seeding Accounts...")
    accounts = []
    # Create 2 accounts for each user (1 savings, 1 checking) -> 110 accounts total
    for uid in user_ids:
        for acc_type in ACCOUNT_TYPES:
            initial = float(random.choice([10000, 25000, 50000, 150000, 500000]))
            try:
                res = requests.post(f"{PROXY_URL}/accounts/", json={
                    "user_id": uid,
                    "account_type": acc_type,
                    "initial_deposit": initial
                })
                if res.status_code == 200:
                    accounts.append(res.json())
            except Exception as e:
                print(f"  Error creating account for user {uid}: {e}")
    print(f"✓ Created {len(accounts)} bank accounts.")

    # Fetch accounts if not enough
    if len(accounts) < 10:
        try:
            res = requests.get(f"{PROXY_URL}/accounts/")
            if res.status_code == 200:
                accounts = res.json()
        except Exception as e:
            print(f"✗ Failed to fetch accounts: {e}")

    # 3. Seed Transactions
    print("\n[3/8] Seeding Transactions...")
    tx_count = 0
    if len(accounts) >= 2:
        # Generate 80 transactions (deposits, withdrawals, transfers)
        for _ in range(80):
            tx_type = random.choice(TRANSACTION_TYPES)
            acc1 = random.choice(accounts)
            acc2 = random.choice(accounts)
            while acc1["account_number"] == acc2["account_number"]:
                acc2 = random.choice(accounts)
            
            amount = float(random.randint(100, 5000))
            payload = {"amount": amount, "type": tx_type}
            
            if tx_type == "deposit":
                payload["to_account"] = acc1["account_number"]
            elif tx_type == "withdraw":
                payload["from_account"] = acc1["account_number"]
            else: # transfer
                payload["from_account"] = acc1["account_number"]
                payload["to_account"] = acc2["account_number"]
                # Ensure source has enough balance for transfer
                if acc1.get("balance", 10000) < amount:
                    payload["type"] = "deposit"
                    payload["to_account"] = acc1["account_number"]
                    payload.pop("from_account", None)
            
            try:
                res = requests.post(f"{PROXY_URL}/transactions/transactions", json=payload)
                if res.status_code == 200:
                    tx_count += 1
            except Exception as e:
                pass
    print(f"✓ Created {tx_count} transactions.")

    # 4. Seed Cards
    print("\n[4/8] Seeding Cards...")
    cards_count = 0
    # Seed 55 cards
    for uid in user_ids[:55]:
        limit = float(random.choice([50000, 100000, 200000, 500000]))
        try:
            res = requests.post(f"{PROXY_URL}/cards/cards", json={
                "user_id": uid,
                "limit_amount": limit
            })
            if res.status_code == 200:
                cards_count += 1
                # Periodically block some cards for realism
                if random.random() < 0.15:
                    card_num = res.json()["card_number"]
                    requests.put(f"{PROXY_URL}/cards/cards/{card_num}/status", json={"status": "blocked"})
        except Exception as e:
            print(f"  Error creating card for user {uid}: {e}")
    print(f"✓ Created {cards_count} credit/debit cards.")

    # 5. Seed Loans
    print("\n[5/8] Seeding Loans...")
    loans_count = 0
    # Seed 55 loans
    for uid in user_ids[:55]:
        amount = float(random.choice([100000, 250000, 500000, 1500000]))
        rate = float(random.choice([7.5, 8.5, 9.2, 10.5, 12.0]))
        try:
            res = requests.post(f"{PROXY_URL}/loans/loans", json={
                "user_id": uid,
                "amount": amount,
                "interest_rate": rate
            })
            if res.status_code == 200:
                loans_count += 1
                loan_id = res.json()["loan_id"]
                # Update status of some loans to approved or rejected
                status_choice = random.choice(["approved", "approved", "rejected", "pending"])
                if status_choice != "pending":
                    requests.put(f"{PROXY_URL}/loans/loans/{loan_id}/status", json={"status": status_choice})
        except Exception as e:
            print(f"  Error creating loan for user {uid}: {e}")
    print(f"✓ Created {loans_count} loans.")

    # 6. Seed Fixed Deposits (FDs)
    print("\n[6/8] Seeding Fixed Deposits...")
    fds_count = 0
    # Seed 55 FDs
    for uid in user_ids[:55]:
        amount = float(random.choice([25000, 50000, 100000, 200000]))
        rate = float(random.choice([5.5, 6.0, 6.75, 7.25]))
        maturity = (datetime.now() + timedelta(days=365 * random.randint(1, 5))).strftime("%Y-%m-%d")
        try:
            res = requests.post(f"{PROXY_URL}/fd/fds", json={
                "user_id": uid,
                "amount": amount,
                "interest_rate": rate,
                "maturity_date": maturity
            })
            if res.status_code == 200:
                fds_count += 1
        except Exception as e:
            print(f"  Error creating FD for user {uid}: {e}")
    print(f"✓ Created {fds_count} Fixed Deposits.")

    # 7. Seed Audit Logs
    print("\n[7/8] Seeding Audit Logs...")
    audit_count = 0
    audit_actions = [
        ("auth-service", "user_login", "Employee login success"),
        ("auth-service", "user_profile_update", "Updated profile contact details"),
        ("accounts-service", "create_account", "Created checking account"),
        ("cards-service", "issue_card", "Issued credit card with limit"),
        ("loans-service", "approve_loan", "Approved home loan application"),
        ("loans-service", "reject_loan", "Rejected personal loan application due to credit score"),
        ("fd-service", "open_fd", "Opened fixed deposit of 100,000 INR"),
        ("transactions-service", "adjust_balance", "Manually adjusted balance for correction"),
    ]
    for _ in range(65):
        service, action, detail = random.choice(audit_actions)
        try:
            res = requests.post(f"{PROXY_URL}/audit/audit", json={
                "service": service,
                "action": action,
                "detail": f"{detail} (Batch ID: {random.randint(1000, 9999)})"
            })
            if res.status_code == 200:
                audit_count += 1
        except Exception as e:
            pass
    print(f"✓ Ingested {audit_count} audit logs.")

    # 8. Seed Analytics Metrics
    print("\n[8/8] Seeding Analytics Metrics...")
    metrics_count = 0
    for _ in range(65):
        metric = random.choice(METRIC_NAMES)
        val = float(random.randint(1, 100)) if "percent" in metric or "attempts" in metric else float(random.randint(50, 1000))
        tags = f"env:production,region:in-west-{random.choice(['1', '2'])}"
        try:
            res = requests.post(f"{PROXY_URL}/analytics/metrics", json={
                "metric": metric,
                "value": val,
                "tags": tags
            })
            if res.status_code == 200:
                metrics_count += 1
        except Exception as e:
            pass
    print(f"✓ Ingested {metrics_count} analytics metrics.")

    print("\n" + "=" * 60)
    print("Database seeding completed successfully!")
    print("=" * 60)
    print("Credentials for test employee login:")
    print("  Username: employee")
    print("  Password: password123")
    print("=" * 60)

if __name__ == "__main__":
    main()
