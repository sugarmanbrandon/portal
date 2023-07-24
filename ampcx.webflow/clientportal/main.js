const firebaseConfig = {
    apiKey: "AIzaSyA6iMP90Rut3jJN2HQ2YIgDrT-UnkCuGcc",
    authDomain: "ampcx-c65ee.firebaseapp.com",
    projectId: "ampcx-c65ee",
    storageBucket: "ampcx-c65ee.appspot.com",
    messagingSenderId: "415601381670",
    appId: "1:415601381670:web:fcf58a8f913cc9b31831e7",
    measurementId: "G-7TR19C873Z"
  };
  
  const approvedDomains = ['boostup.ai', 'codesleeprepeat.com'];
  
  firebase.initializeApp(firebaseConfig);
  
  var toggleBtn = document.getElementById('toggle-btn');
  var loginForm = document.getElementById('login');
  var signupForm = document.getElementById('signup');
  
  toggleBtn.addEventListener('click', function() {
      if(loginForm.style.display === 'none') {
          loginForm.style.display = 'block';
          signupForm.style.display = 'none';
      } else {
          loginForm.style.display = 'none';
          signupForm.style.display = 'block';
      }
  });
  
  // Login event
  var loginBtn = document.getElementById('login-btn');
  if(loginBtn) {
      loginBtn.addEventListener('click', loginEvent);
  }
  
  // Signup event
  var signupBtn = document.getElementById('signup-btn');
  if(signupBtn) {
      signupBtn.addEventListener('click', signupEvent);
  }
  
  // Password reset event
  var forgotPasswordBtn = document.getElementById('forgot-password-btn');
  if(forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', forgotPasswordEvent);
  }
  
  function loginEvent(e) {
      e.preventDefault();
      var email = document.getElementById('login-email').value;
      var password = document.getElementById('login-password').value;
  
      firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
          // Signed in
          var user = userCredential.user;
          // Redirect to user page
          window.location.href = "clientportal/user.html";
      })
      .catch((error) => {
          var errorCode = error.code;
          var errorMessage = error.message;
          // Show error message to user
          showErrorModal(errorMessage);
      });
  }
  
  function signupEvent(e) {
      e.preventDefault();
      var email = document.getElementById('signup-email').value;
      var password = document.getElementById('signup-password').value;
      var name = document.getElementById('signup-name').value;
      var company = document.getElementById('signup-company').value;
  
      // Check if the email domain is in the approvedDomains array
      var emailDomain = email.split('@')[1];
      if (approvedDomains.includes(emailDomain)) {
          firebase.auth().createUserWithEmailAndPassword(email, password)
          .then((userCredential) => {
              // Signed in
              var user = userCredential.user;
              user.updateProfile({
                  displayName: name
              }).then(function() {
                  // Update successful
                  user.sendEmailVerification();
                  firebase.database().ref('users/' + user.uid).set({
                      name: name,
                      company: company
                  });
                  // Redirect to user page
                  window.location.href = "./user.html"; // change
              }).catch(function(error) {
                  // An error happened
                  showErrorModal(error.message);
              });
          })
          .catch((error) => {
              var errorCode = error.code;
              var errorMessage = error.message;
              // Show error message to user
              showErrorModal(errorMessage);
          });
      } else {
          // Show error message to user
          showErrorModal('Email domain not allowed.');
      }
  }
  
  function forgotPasswordEvent(e) {
      e.preventDefault();
      var emailAddress = document.getElementById('login-email').value;
  
      firebase.auth().sendPasswordResetEmail(emailAddress)
      .then(function() {
          // Email sent
          alert('Password reset email sent!');
      }).catch(function(error) {
          // An error happened
          var errorCode = error.code;
          var errorMessage = error.message;
          showErrorModal(errorMessage);
      });
  }
  
  function showErrorModal(message) {
    var modal = document.getElementById('error-modal');
    var closeModal = document.getElementById('close-modal');
    var errorMessage = document.getElementById('error-message');
  
    errorMessage.innerHTML = message;
    modal.style.display = 'block';
  
    closeModal.onclick = function() {
      modal.style.display = 'none';
    };
  
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    };
  }
