import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from "firebase/firestore";
import firebaseConfigDefault from "./firebase-applet-config.json";

// Handle default-wrapped JSON imports safely across different runtimes
const firebaseConfig = (firebaseConfigDefault as any).default || firebaseConfigDefault;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
// CRITICAL: The app will break without passing firestoreDatabaseId in workspace environments
let firestoreInstance;
try {
  const dbId = firebaseConfig.firestoreDatabaseId;
  if (dbId && dbId !== "(default)" && dbId !== "PLACEHOLDER") {
    firestoreInstance = getFirestore(app, dbId);
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch (e) {
  console.error("Failed to initialize named firestore, falling back to default database instance:", e);
  firestoreInstance = getFirestore(app);
}

// Enable offline database persistence for offline retail operation
if (typeof window !== "undefined") {
  enableMultiTabIndexedDbPersistence(firestoreInstance)
    .then(() => {
      console.log("Firestore multi-tab offline database persistence successfully established.");
    })
    .catch((err: any) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn("Firestore multi-tab persistence failed-precondition, falling back to single-tab persistence.");
        enableIndexedDbPersistence(firestoreInstance).catch((singleErr: any) => {
          console.warn("Firestore offline database single-tab persistence failed:", singleErr);
        });
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn("Firestore offline database persistence is unimplemented in this browser environment.");
      } else {
        console.warn("Firestore offline database persistence failed to enable:", err);
      }
    });
}

export const db = firestoreInstance;

// Operation Types for error tracing
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write"
}

// Error Interface
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global Custom Error Handler complying with the Firebase integration guideline
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection
export async function testConnection() {
  if (firebaseConfig.apiKey === "PLACEHOLDER") {
    console.warn("Firebase configuration is using placeholders. Please complete setup in the UI.");
    return false;
  }
  if (!db) {
    console.warn("Firestore db object is not initialized. Skipping automated connection test.");
    return false;
  }
  try {
    // Attempt a live fetch from server
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. Client is offline.");
    } else {
      console.error("Firebase connection test returned error:", error);
    }
    return false;
  }
}

// Execute connection test
testConnection();
