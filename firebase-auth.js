import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const invalid = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes("여기에_") || firebaseConfig.projectId.includes("여기에_");
const status = (message) => { const el=document.getElementById("cloudStatus"); if(el) el.textContent=message; };
if (invalid) {
  status("Firebase 연결 설정이 필요해요");
  window.cloudSignIn = () => alert("먼저 firebase-config.js에 Firebase 프로젝트 설정값을 입력하고 웹사이트에 배포해 주세요.");
  window.cloudSignOut = () => {};
} else {
  const app=initializeApp(firebaseConfig);
  const auth=getAuth(app);
  const db=getFirestore(app);
  const provider=new GoogleAuthProvider();
  window.cloudSignIn=()=>signInWithRedirect(auth,provider).catch(e=>{console.error(e);alert("구글 로그인에 실패했어요. Firebase 승인 도메인과 인터넷 연결을 확인해 주세요.");});
  window.cloudSignOut=()=>signOut(auth).catch(e=>alert("로그아웃에 실패했어요."));
  window.cloudSaveLedger=async(data)=>{
    if(!auth.currentUser) throw new Error("로그인 상태가 아닙니다.");
    await setDoc(doc(db,"users",auth.currentUser.uid,"data","ledger"),{payload:data,updatedAt:serverTimestamp()});
  };
  getRedirectResult(auth).catch(e=>console.error("로그인 리디렉션 확인 오류",e));
  setPersistence(auth,browserLocalPersistence).then(()=>{
    onAuthStateChanged(auth,async user=>{
      window.updateLedgerAuthUI(user);
      if(!user){status("로그인 전");return;}
      status("클라우드 기록 확인 중…");
      try{
        const ref=doc(db,"users",user.uid,"data","ledger");
        const snap=await getDoc(ref);
        if(snap.exists()){
          window.loadCloudLedgerData(snap.data().payload);
        }else{
          // 최초 로그인: 현재 브라우저에 남아 있는 기존 가계부를 최초 클라우드 기록으로 옮깁니다.
          const localData=window.getLocalLedgerData();
          await setDoc(ref,{payload:localData,updatedAt:serverTimestamp()});
          window.loadCloudLedgerData(localData);
        }
        window.setLedgerCloudReady(true);
        status("클라우드 저장 연결됨");
      }catch(e){
        console.error(e);status("클라우드 연결 실패");
        alert("클라우드 데이터를 불러오지 못했어요. Firebase 설정과 보안 규칙을 확인해 주세요.");
      }
    });
  }).catch(e=>{console.error(e);status("로그인 초기화 실패");});
}
