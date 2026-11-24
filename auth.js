'use strict';
(() => {
  const $=id=>document.getElementById(id);
  const config=globalThis.TRANSITLINK_FIREBASE;
  const status=$('auth-status'),methods=$('auth-methods'),dialog=$('account-dialog');
  if (!config||!['apiKey','authDomain','projectId','appId'].every(key=>config[key])) {
    status.textContent='Online sign-in needs Firebase configuration. You can use a local profile in this browser.';
    return;
  }
  if (location.protocol==='file:') {
    status.textContent='Open the hosted TransitLink website for online sign-in.';
    return;
  }
  const sdk='https://www.gstatic.com/firebasejs/13.4.0/';
  status.textContent='Connecting to sign-in…';
  Promise.all([import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js')])
    .then(([app,api])=>setup(api,api.getAuth(app.initializeApp(config))))
    .catch(()=>{status.textContent='Online sign-in could not connect. Check your connection and refresh to retry.';});

  function setup(api,auth) {
    let verifier=null,confirmation=null,busy=false;
    const phoneDetails=$('auth-phone-details'),codeForm=$('auth-code');
    const errors={
      'auth/popup-blocked':'Allow pop-ups for this site to continue with Google.',
      'auth/popup-closed-by-user':'The Google sign-in window was closed.',
      'auth/unauthorized-domain':'This website domain needs to be authorised in Firebase.',
      'auth/operation-not-allowed':'Enable this sign-in method in Firebase.',
      'auth/invalid-credential':'Check your email and password and try again.',
      'auth/email-already-in-use':'Use Log in or Reset password for an existing account.',
      'auth/weak-password':'Choose a stronger password.',
      'auth/invalid-verification-code':'Check the SMS code and try again.',
      'auth/code-expired':'This code has expired. Request a new SMS.',
      'auth/too-many-requests':'Too many attempts. Try again later.',
      'auth/invalid-phone-number':'Enter a valid phone number with its country code.',
      'auth/captcha-check-failed':'Complete the verification check and try again.',
      'auth/network-request-failed':'Check your internet connection and try again.',
    };
    const message=e=>status.textContent=errors[e.code]||'Sign-in could not finish. Try again or choose another method.';
    function clearVerifier() {
      verifier?.clear();
      verifier=null;
      $('auth-recaptcha').replaceChildren();
    }
    async function run(task) {
      if (busy) return;
      busy=true;
      status.textContent='';
      const buttons=[...methods.querySelectorAll('button')];
      buttons.forEach(button=>button.disabled=true);
      try {await task();} catch (error) {message(error);}
      finally {busy=false;buttons.forEach(button=>button.disabled=false);}
    }
    api.onAuthStateChanged(auth,user=>{
      const verified=user&&(user.emailVerified||Boolean(user.phoneNumber)||
        user.providerData.some(provider=>provider.providerId==='google.com'));
      window.dispatchEvent(new CustomEvent('transitlink:identity',{detail:verified?
        {uid:user.uid,label:user.displayName||user.email||user.phoneNumber||'your account'}:null}));
      if (verified&&dialog.open) dialog.close();
    });
    window.addEventListener('transitlink:signout',()=>{
      run(async()=>{
        try {await api.signOut(auth);} catch (error) {
          if (!dialog.open) dialog.showModal();
          throw error;
        }
      });
    });
    $('auth-google').onclick=()=>run(()=>api.signInWithPopup(auth,new api.GoogleAuthProvider()));
    const email=()=>$('auth-address').value.trim();
    $('auth-email').onsubmit=event=>{
      event.preventDefault();
      const register=event.submitter?.value==='register';
      run(async()=>{
        const method=register?api.createUserWithEmailAndPassword:api.signInWithEmailAndPassword;
        const {user}=await method(auth,email(),$('auth-password').value);
        if (user.emailVerified) return;
        try {await api.sendEmailVerification(user);}
        finally {await api.signOut(auth);}
        status.textContent='Check your inbox for a verification link, then come back and log in.';
      });
    };
    $('auth-reset').onclick=()=>{
      if (!$('auth-address').reportValidity()) return;
      run(async()=>{
        await api.sendPasswordResetEmail(auth,email());
        status.textContent='If the address has an account, check your inbox for a password reset link.';
      });
    };
    phoneDetails.addEventListener('toggle',()=>{
      if (!phoneDetails.open||verifier||confirmation) return;
      run(async()=>{
        try {
          verifier=new api.RecaptchaVerifier(auth,'auth-recaptcha',{size:'normal'});
          await verifier.render();
        } catch (error) {clearVerifier();throw error;}
      });
    });
    $('auth-phone').onsubmit=event=>{
      event.preventDefault();
      const number=$('auth-number').value.replace(/[\s()-]/g,'');
      if (!/^\+[1-9]\d{6,14}$/.test(number)) {
        status.textContent='Enter the country code and phone number, such as +91 followed by your number.';
        return;
      }
      run(async()=>{
        try {
          if (!verifier) verifier=new api.RecaptchaVerifier(auth,'auth-recaptcha',{size:'normal'});
          const result=await api.signInWithPhoneNumber(auth,number,verifier);
          if (!dialog.open) return;
          confirmation=result;
          codeForm.hidden=false;
          $('auth-otp').focus();
          status.textContent='SMS sent. Enter the six-digit code.';
        } finally {clearVerifier();}
      });
    };
    codeForm.onsubmit=event=>{
      event.preventDefault();
      if (confirmation) run(()=>confirmation.confirm($('auth-otp').value.trim()));
    };
    dialog.addEventListener('close',()=>{
      if (!busy) clearVerifier();
      confirmation=null;
      codeForm.hidden=true;
      phoneDetails.open=false;
      $('auth-otp').value='';
      $('auth-password').value='';
      status.textContent='';
    });
    methods.hidden=false;
    status.textContent='';
  }
})();
