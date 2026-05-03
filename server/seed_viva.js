import "dotenv/config";

const API_URL = "http://localhost:5000/api/v1";

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Login failed for ${email}: ${data.message}`);
  return { token: data.data.token, user: data.data.user };
}

async function register(name, email, password) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!data.success) {
    if (data.message.includes("already exists") || data.message.includes("E11000")) {
      // already registered, just login
      return login(email, password);
    }
    throw new Error(`Register failed for ${email}: ${data.message}`);
  }
  return { token: data.data.token, user: data.data.user };
}

async function addMember(token, groupId, userId) {
  const res = await fetch(`${API_URL}/groups/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  // ignore errors if they are already in the group
  if (!data.success && !data.message.includes("already a member") && !data.message.includes("User already in group")) {
    throw new Error(`Add member failed: ${data.message}`);
  }
}

async function addExpense(token, groupId, expenseData) {
  const res = await fetch(`${API_URL}/expenses/${groupId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(expenseData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Add expense failed: ${data.message}`);
  return data.data;
}

async function seed() {
  try {
    console.log("1. Logging in as Admin...");
    const admin = await login("test@arthika.com", "Arthika@FS123");
    console.log(`✅ Logged in Admin: ${admin.user.name} (${admin.user.id})`);

    console.log("2. Creating/Logging in 5 Member Accounts...");
    const membersData = [
      { name: "Rahul Sharma", email: "rahul@arthika.com", password: "Rahul@Viva2026" },
      { name: "Priya Patel", email: "priya@arthika.com", password: "Priya@Viva2026" },
      { name: "Amit Kumar", email: "amit@arthika.com", password: "Amit@Viva2026" },
      { name: "Sneha Reddy", email: "sneha@arthika.com", password: "Sneha@Viva2026" },
      { name: "Vikram Singh", email: "vikram@arthika.com", password: "Vikram@Viva2026" },
    ];

    const members = [];
    for (const m of membersData) {
      const acc = await register(m.name, m.email, m.password);
      members.push(acc);
      console.log(`✅ Registered/Logged in: ${m.name} (${acc.user.id})`);
    }

    const groupTTD = "69e87e2c86cad9b10e395032";
    const groupTrivandrum = "69f715926703a90b0cbc5147";

    console.log("3. Adding Members to Existing Groups...");
    for (const m of members) {
      await addMember(admin.token, groupTTD, m.user.id);
      console.log(`✅ Added ${m.user.name} to TTD`);
      await addMember(admin.token, groupTrivandrum, m.user.id);
      console.log(`✅ Added ${m.user.name} to Trivandrum Trip`);
    }

    console.log("4. Adding Expenses to TTD...");
    await addExpense(admin.token, groupTTD, {
      title: "Temple VIP Darshan Tickets",
      amount: "1500",
      paidBy: admin.user.id,
      splitType: "equal",
      categoryId: "Entertainment"
    });
    console.log("✅ Added Expense: Darshan Tickets (₹1,500) - Paid by Admin, Split Equal");

    await addExpense(members[0].token, groupTTD, {
      title: "Prasadam & Laddu",
      amount: "500",
      paidBy: members[0].user.id, // Rahul
      splitType: "exact",
      splits: [
        { user: admin.user.id, amount: "100" },
        { user: members[0].user.id, amount: "200" },
        { user: members[1].user.id, amount: "200" }
      ],
      categoryId: "Food"
    });
    console.log("✅ Added Expense: Prasadam (₹500) - Paid by Rahul, Custom Split");

    console.log("5. Adding Expenses to Trivandrum Trip...");
    await addExpense(admin.token, groupTrivandrum, {
      title: "Beach House Booking",
      amount: "12000",
      paidBy: admin.user.id,
      splitType: "equal",
      categoryId: "Accommodation"
    });
    console.log("✅ Added Expense: Beach House (₹12,000) - Paid by Admin, Split Equal");

    await addExpense(members[2].token, groupTrivandrum, {
      title: "Seafood Dinner",
      amount: "4500",
      paidBy: members[2].user.id, // Amit
      splitType: "percentage",
      splits: [
        { user: admin.user.id, amount: 40 },
        { user: members[2].user.id, amount: 20 },
        { user: members[3].user.id, amount: 20 },
        { user: members[4].user.id, amount: 20 }
      ],
      categoryId: "Food"
    });
    console.log("✅ Added Expense: Seafood Dinner (₹4,500) - Paid by Amit, Percentage Split");

    console.log("\n🎉 SEEDING COMPLETE! You can now check the Dashboard to see all the data beautifully populated.");
    
    console.log("\n🔑 TEST ACCOUNTS (Member Logins for Viva):");
    membersData.forEach(m => {
      console.log(`Email: ${m.email} | Password: ${m.password}`);
    });
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
  }
}

seed();
