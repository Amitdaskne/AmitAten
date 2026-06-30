import { ref, set, get, child, remove } from 'firebase/database';
import { database } from './config';
import { User, AttendanceRecord, CompanySettings } from '../types';
import { getLocalDateString, calculateLateStatus, calculateEarlyExitStatus } from '../utilities/dateUtils';

// Helper paths
const USERS_PATH = 'users';
const ATTENDANCE_PATH = 'attendance';
const SETTINGS_PATH = 'settings';

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Amit Opticals",
  companyLogo: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=200&h=200&q=80",
  officeAddress: "Kishanganj, Bihar, India",
  officeTimingStart: "09:30",
  officeTimingEnd: "19:30",
  lateGraceMinutes: 15,
  halfDayHours: 4,
  fullDayHours: 8,
  weekendDays: [0] // Sunday only
};

// --- LocalStorage Fallback Database Helpers ---
const LS_KEYS = {
  USERS: 'amitaten_local_users',
  SETTINGS: 'amitaten_local_settings',
  ATTENDANCE: 'amitaten_local_attendance'
};

function getLocalUsers(): Record<string, User> {
  try {
    const data = localStorage.getItem(LS_KEYS.USERS);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('LocalStorage error:', e);
    return {};
  }
}

function saveLocalUsers(users: Record<string, User>) {
  try {
    localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

function getLocalSettings(): CompanySettings {
  try {
    const data = localStorage.getItem(LS_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings: CompanySettings) {
  try {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

function getLocalAttendance(): Record<string, Record<string, AttendanceRecord>> {
  try {
    const data = localStorage.getItem(LS_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveLocalAttendance(attendance: Record<string, Record<string, AttendanceRecord>>) {
  try {
    localStorage.setItem(LS_KEYS.ATTENDANCE, JSON.stringify(attendance));
  } catch (e) {
    console.error('LocalStorage error:', e);
  }
}

/**
 * Seeds initial data (Admin and a normal User) if `/users` does not exist.
 * Synchronizes seeds into both LocalStorage and Firebase.
 */
export async function seedInitialData(): Promise<void> {
  const dbRef = ref(database);
  
  // 1. Ensure LocalStorage has standard seed data as a local safety net
  const localUsers = getLocalUsers();
  if (Object.keys(localUsers).length === 0) {
    console.log("Seeding LocalStorage default Admin and User...");
    const adminId = 'admin';
    const adminUser: User = {
      id: adminId,
      username: 'admin',
      password: '7277',
      name: 'Amit Das (Admin)',
      email: 'amit@amitopticals.com',
      phone: '+91 98765 43210',
      address: 'Kishanganj, Bihar, India',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=300&q=80',
      role: 'admin',
      department: 'Management',
      designation: 'Director',
      employeeId: 'EMP-001',
      joiningDate: '2026-01-01',
      shiftTiming: '09:30 AM - 07:30 PM',
      officeLocation: 'Store 1',
      status: 'enabled',
      qrCodeData: adminId,
      emergencyContact: 'Emergency Contact: +91 99999 88888',
      createdAt: Date.now()
    };

    const userId = 'user';
    const normalUser: User = {
      id: userId,
      username: 'user',
      password: 'userpassword',
      name: 'John Doe',
      email: 'john.doe@amitopticals.com',
      phone: '+91 98765 43211',
      address: 'Staff Quarters, Store 1',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80',
      role: 'user',
      department: 'Store 1',
      designation: 'Sales Executive',
      employeeId: 'EMP-002',
      joiningDate: '2026-03-15',
      shiftTiming: '09:30 AM - 07:30 PM',
      officeLocation: 'Store 1',
      status: 'enabled',
      qrCodeData: userId,
      emergencyContact: 'Mary Doe (Wife) - +91 91111 22222',
      createdAt: Date.now()
    };

    saveLocalUsers({ [adminId]: adminUser, [userId]: normalUser });
    saveLocalSettings(DEFAULT_SETTINGS);

    // Create beautiful dummy logs for analytics
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    const yesterdayIn = new Date(yesterday);
    yesterdayIn.setHours(9, 5, 0); // Tapped in early/normal
    const yesterdayOut = new Date(yesterday);
    yesterdayOut.setHours(17, 10, 0); // worked full shift

    const yesterdayRecord: AttendanceRecord = {
      id: `${userId}_${yesterdayStr}`,
      userId,
      userName: normalUser.name,
      userEmployeeId: normalUser.employeeId,
      userDepartment: normalUser.department,
      date: yesterdayStr,
      tapInTime: yesterdayIn.getTime(),
      tapOutTime: yesterdayOut.getTime(),
      workingHours: 8.08,
      breakDuration: 0,
      totalWorkingTime: '8h 5m',
      status: 'present',
      isLate: false,
      isEarlyExit: false
    };

    const dayBefore = new Date();
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeStr = getLocalDateString(dayBefore);

    const dayBeforeIn = new Date(dayBefore);
    dayBeforeIn.setHours(9, 45, 0); // Late tap in
    const dayBeforeOut = new Date(dayBefore);
    dayBeforeOut.setHours(17, 0, 0);

    const dayBeforeRecord: AttendanceRecord = {
      id: `${userId}_${dayBeforeStr}`,
      userId,
      userName: normalUser.name,
      userEmployeeId: normalUser.employeeId,
      userDepartment: normalUser.department,
      date: dayBeforeStr,
      tapInTime: dayBeforeIn.getTime(),
      tapOutTime: dayBeforeOut.getTime(),
      workingHours: 7.25,
      breakDuration: 0,
      totalWorkingTime: '7h 15m',
      status: 'late',
      isLate: true,
      isEarlyExit: false
    };

    saveLocalAttendance({
      [userId]: {
        [yesterdayStr]: yesterdayRecord,
        [dayBeforeStr]: dayBeforeRecord
      }
    });
  }

  // 2. Try to sync and seed Firebase Realtime Database
  try {
    const usersSnap = await get(child(dbRef, USERS_PATH));
    if (!usersSnap.exists() || Object.keys(usersSnap.val() || {}).length === 0) {
      console.log("Firebase Database is empty. Seeding default Admin and User...");

      // Set settings
      const settings = getLocalSettings();
      await set(ref(database, SETTINGS_PATH), settings);

      // Set admin user
      const localUsersMap = getLocalUsers();
      for (const uid of Object.keys(localUsersMap)) {
        await set(ref(database, `${USERS_PATH}/${uid}`), localUsersMap[uid]);
      }

      // Set logs
      const localAttMap = getLocalAttendance();
      for (const uid of Object.keys(localAttMap)) {
        const userLogs = localAttMap[uid];
        for (const dateStr of Object.keys(userLogs)) {
          await set(ref(database, `${ATTENDANCE_PATH}/${uid}/${dateStr}`), userLogs[dateStr]);
        }
      }

      console.log("Firebase Database seeded successfully!");
    }
  } catch (error) {
    console.error("Firebase seeding skipped or failed (using LocalStorage fallback):", error);
  }
}

/**
 * Fetches all users.
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const dbRef = ref(database);
    const snap = await get(child(dbRef, USERS_PATH));
    if (snap.exists()) {
      const rawData = snap.val();
      const users = Object.keys(rawData).map(key => ({
        ...rawData[key],
        id: key
      })) as User[];
      
      // Update local storage representation
      const localMap: Record<string, User> = {};
      users.forEach(u => { localMap[u.id] = u; });
      saveLocalUsers(localMap);
      
      return users;
    }
  } catch (error) {
    console.warn("Failed to fetch users from Firebase, falling back to LocalStorage:", error);
  }
  
  return Object.values(getLocalUsers());
}

/**
 * Fetches single user by ID.
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const dbRef = ref(database);
    const snap = await get(child(dbRef, `${USERS_PATH}/${userId}`));
    if (snap.exists()) {
      const user = { ...snap.val(), id: userId } as User;
      
      // Update local storage representation
      const localUsers = getLocalUsers();
      localUsers[userId] = user;
      saveLocalUsers(localUsers);
      
      return user;
    }
  } catch (error) {
    console.warn(`Failed to fetch user ${userId} from Firebase, falling back to LocalStorage:`, error);
  }
  
  return getLocalUsers()[userId] || null;
}

/**
 * Saves (creates/updates) user.
 */
export async function saveUser(user: User): Promise<void> {
  // Save locally first
  const localUsers = getLocalUsers();
  localUsers[user.id] = user;
  saveLocalUsers(localUsers);

  // Try Firebase
  try {
    await set(ref(database, `${USERS_PATH}/${user.id}`), user);
  } catch (error) {
    console.warn("Failed to save user to Firebase, local copy updated successfully:", error);
  }
}

/**
 * Deletes user and their attendance records.
 */
export async function deleteUser(userId: string): Promise<void> {
  // Delete locally first
  const localUsers = getLocalUsers();
  delete localUsers[userId];
  saveLocalUsers(localUsers);

  const localAtt = getLocalAttendance();
  delete localAtt[userId];
  saveLocalAttendance(localAtt);

  // Try Firebase
  try {
    await remove(ref(database, `${USERS_PATH}/${userId}`));
    await remove(ref(database, `${ATTENDANCE_PATH}/${userId}`));
  } catch (error) {
    console.warn("Failed to delete user from Firebase, local copy removed successfully:", error);
  }
}

/**
 * Fetches company settings.
 */
export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const dbRef = ref(database);
    const snap = await get(child(dbRef, SETTINGS_PATH));
    if (snap.exists()) {
      const settings = snap.val() as CompanySettings;
      saveLocalSettings(settings);
      return settings;
    }
  } catch (error) {
    console.warn("Failed to fetch settings from Firebase, falling back to LocalStorage:", error);
  }
  
  return getLocalSettings();
}

/**
 * Saves company settings.
 */
export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  // Save locally first
  saveLocalSettings(settings);

  // Try Firebase
  try {
    await set(ref(database, SETTINGS_PATH), settings);
  } catch (error) {
    console.warn("Failed to save company settings to Firebase, local copy updated:", error);
  }
}

/**
 * Fetches attendance for a single user.
 */
export async function getUserAttendance(userId: string): Promise<AttendanceRecord[]> {
  try {
    const dbRef = ref(database);
    const snap = await get(child(dbRef, `${ATTENDANCE_PATH}/${userId}`));
    if (snap.exists()) {
      const rawData = snap.val();
      const records = Object.keys(rawData).map(key => rawData[key]) as AttendanceRecord[];
      
      // Update local storage copy
      const localAtt = getLocalAttendance();
      localAtt[userId] = rawData;
      saveLocalAttendance(localAtt);
      
      return records;
    }
  } catch (error) {
    console.warn(`Failed to fetch attendance for user ${userId} from Firebase, falling back to LocalStorage:`, error);
  }
  
  const userRecords = getLocalAttendance()[userId] || {};
  return Object.values(userRecords);
}

/**
 * Fetches today's attendance for a single user (helper).
 */
export async function getTodayUserAttendance(userId: string): Promise<AttendanceRecord | null> {
  const todayStr = getLocalDateString();
  try {
    const dbRef = ref(database);
    const snap = await get(child(dbRef, `${ATTENDANCE_PATH}/${userId}`));
    if (snap.exists()) {
      const rawData = snap.val();
      const records = Object.values(rawData) as AttendanceRecord[];
      // Look for any active session first (tapInTime is set but no tapOutTime)
      const activeRecord = records.find(r => r.tapInTime && !r.tapOutTime);
      if (activeRecord) {
        return activeRecord;
      }
      return rawData[todayStr] || null;
    }
  } catch (error) {
    console.warn(`Failed to fetch today's attendance for user ${userId} from Firebase, falling back to LocalStorage:`, error);
  }
  
  const userRecords = getLocalAttendance()[userId] || {};
  const activeRecord = Object.values(userRecords).find((r: any) => r.tapInTime && !r.tapOutTime) as AttendanceRecord | null;
  if (activeRecord) {
    return activeRecord;
  }
  return userRecords[todayStr] || null;
}

/**
 * Fetches all attendance records (across all users) for reporting.
 */
export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  try {
    const dbRef = ref(database);
    const snap = await get(child(dbRef, ATTENDANCE_PATH));
    if (snap.exists()) {
      const rawData = snap.val();
      const records: AttendanceRecord[] = [];
      
      Object.keys(rawData).forEach(userId => {
        const userRecords = rawData[userId];
        Object.keys(userRecords).forEach(dateStr => {
          records.push(userRecords[dateStr]);
        });
      });
      
      // Sync LocalStorage
      saveLocalAttendance(rawData);
      
      return records;
    }
  } catch (error) {
    console.warn("Failed to fetch all attendance records from Firebase, falling back to LocalStorage:", error);
  }
  
  const localAtt = getLocalAttendance();
  const records: AttendanceRecord[] = [];
  Object.keys(localAtt).forEach(userId => {
    const userRecords = localAtt[userId];
    Object.keys(userRecords).forEach(dateStr => {
      records.push(userRecords[dateStr]);
    });
  });
  return records;
}

/**
 * Perform Tap-In for a user.
 */
export async function performTapIn(
  userId: string,
  userName: string,
  userEmployeeId: string,
  userDepartment: string
): Promise<AttendanceRecord> {
  const todayStr = getLocalDateString();
  
  // Validate locally first to prevent duplicate checks if firebase is slow or failing
  const localAtt = getLocalAttendance();
  const userRecords = localAtt[userId] || {};
  if (userRecords[todayStr]) {
    throw new Error('Already checked in (Tapped In) for today.');
  }

  // Try to query Firebase if accessible to stay tightly in sync
  try {
    const dbRef = ref(database);
    const existingRecordSnap = await get(child(dbRef, `${ATTENDANCE_PATH}/${userId}/${todayStr}`));
    if (existingRecordSnap.exists()) {
      throw new Error('Already checked in (Tapped In) for today.');
    }
  } catch (e) {
    console.warn("Firebase check failed, relying on LocalStorage check for check-in state.", e);
  }

  const settings = await getCompanySettings();
  const tapInTime = Date.now();
  
  const isLate = calculateLateStatus(tapInTime, settings.officeTimingStart, settings.lateGraceMinutes);
  const status = isLate ? 'late' : 'present';

  const newRecord: AttendanceRecord = {
    id: `${userId}_${todayStr}`,
    userId,
    userName,
    userEmployeeId,
    userDepartment,
    date: todayStr,
    tapInTime,
    tapOutTime: null,
    workingHours: 0,
    breakDuration: 0,
    totalWorkingTime: '0h 0m',
    status,
    isLate,
    isEarlyExit: false
  };

  // Update LocalStorage first
  if (!localAtt[userId]) {
    localAtt[userId] = {};
  }
  localAtt[userId][todayStr] = newRecord;
  saveLocalAttendance(localAtt);

  // Update Firebase
  try {
    await set(ref(database, `${ATTENDANCE_PATH}/${userId}/${todayStr}`), newRecord);
  } catch (error) {
    console.warn("Failed to write Tap-In record to Firebase, written locally:", error);
  }

  return newRecord;
}

/**
 * Perform Tap-Out for a user.
 */
export async function performTapOut(userId: string): Promise<AttendanceRecord> {
  // Fetch local check-in
  const localAtt = getLocalAttendance();
  const userRecords = localAtt[userId] || {};
  
  // Find an active session locally first
  let record: AttendanceRecord | null = Object.values(userRecords).find((r: any) => r.tapInTime && !r.tapOutTime) as AttendanceRecord | null;

  // Try to retrieve fresh active record from Firebase
  try {
    const dbRef = ref(database);
    const snap = await get(child(dbRef, `${ATTENDANCE_PATH}/${userId}`));
    if (snap.exists()) {
      const rawData = snap.val();
      const dbRecord = (Object.values(rawData) as AttendanceRecord[]).find(r => r.tapInTime && !r.tapOutTime);
      if (dbRecord) {
        record = dbRecord;
      }
    }
  } catch (e) {
    console.warn("Firebase fetch failed, relying on LocalStorage check for checkout state.", e);
  }

  if (!record) {
    throw new Error('You must Tap In before you can Tap Out.');
  }

  const recordDateStr = record.date; // Use the actual date they checked in!

  const settings = await getCompanySettings();
  const tapOutTime = Date.now();
  
  const diffMs = tapOutTime - record.tapInTime;
  const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
  
  const totalMinutes = Math.round(workingHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const totalWorkingTime = `${h}h ${m}m`;

  const isEarlyExit = calculateEarlyExitStatus(tapOutTime, settings.officeTimingEnd);
  
  let finalStatus: AttendanceRecord['status'] = record.status;
  if (workingHours < settings.halfDayHours) {
    finalStatus = 'half_day';
  } else if (isEarlyExit && record.status !== 'late') {
    finalStatus = 'early_exit';
  } else if (record.status !== 'late') {
    finalStatus = 'present';
  }

  const updatedRecord: AttendanceRecord = {
    ...record,
    tapOutTime,
    workingHours,
    totalWorkingTime,
    status: finalStatus,
    isEarlyExit
  };

  // Update LocalStorage first
  if (!localAtt[userId]) {
    localAtt[userId] = {};
  }
  localAtt[userId][recordDateStr] = updatedRecord;
  saveLocalAttendance(localAtt);

  // Update Firebase
  try {
    await set(ref(database, `${ATTENDANCE_PATH}/${userId}/${recordDateStr}`), updatedRecord);
  } catch (error) {
    console.warn("Failed to write Tap-Out record to Firebase, written locally:", error);
  }

  return updatedRecord;
}
