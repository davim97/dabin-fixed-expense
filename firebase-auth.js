import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const status = (message) => {
  const el = document.getElementById("cloudStatus");
  if (el) el.textContent = message;
};

const invalid =
  !firebaseConfig.apiKey ||
  !firebaseConfig.projectId;

if (invalid) {
  status("Firebase 연결 설정이 필요해요");
  window.cloudSignIn = () => alert("Firebase 설정을 확인해 주세요.");
  window.cloudSignOut = () => {};
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  window.cloudSignIn = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithRedirect(auth, provider);
    } catch (e) {
      console.error("로그인 오류:", e);
      alert("로그인 실패: " + e.code);
    }
  };

  window.cloudSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
      alert("로그아웃에 실패했어요.");
    }
  };

  window.cloudSaveLedger = async (data) => {
    if (!auth.currentUser) {
      throw new Error("로그인 상태가 아닙니다.");
    }

    await setDoc(
      doc(db, "users", auth.currentUser.uid, "data", "ledger"),
      {
        payload: data,
        updatedAt: serverTimestamp()
      }
    );
  };

  const initializeAuth = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await getRedirectResult(auth);

      onAuthStateChanged(auth, async (user) => {
        window.updateLedgerAuthUI(user);

        if (!user) {
          status("로그인 전");
          return;
        }

        status("클라우드 기록 확인 중…");

        try {
          const ref = doc(db, "users", user.uid, "data", "ledger");
          const snap = await getDoc(ref);

          if (snap.exists()) {
            window.loadCloudLedgerData(snap.data().payload);
          } else {
            const localData = window.getLocalLedgerData();

            await setDoc(ref, {
              payload: localData,
              updatedAt: serverTimestamp()
            });

            window.loadCloudLedgerData(localData);
          }

          window.setLedgerCloudReady(true);
          status("클라우드 저장 연결됨");
        } catch (e) {
          console.error("클라우드 오류:", e);
          status("클라우드 연결 실패");
          alert("클라우드 연결 실패: " + e.code);
        }
      });
    } catch (e) {
      console.error("로그인 초기화 오류:", e);
      status("로그인 초기화 실패");
      alert("로그인 초기화 실패: " + e.code);
    }
  };

  initializeAuth();
}
