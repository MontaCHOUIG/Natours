/* eslint-disable */

import { showAlert } from "./alerts";







const formData = document.querySelector('.form');

const postData = async (url, data) => {
  console.log("postData working")
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.json();
};
  const login = (email, password) => {
  console.log("login working")
  postData('http://127.0.0.1:3000/api/v1/users/login', {
    email,
    password,
  }).then((data) => {
    console.log(data)
    if(data.message === 'success'){
        showAlert('success','LoggedIn successfuly !')
        window.setTimeout(() => {
          location.assign('/')
        }, 1500)
      
    }else if (data.status === 'fail'){
        showAlert("error","wrong input")
    } 
  }).catch(err => console.error(err))
  
  
};


if(formData){

formData.addEventListener('submit', event => {
  event.preventDefault()
  const password = document.getElementById('password').value
  const email = document.getElementById('email').value
  login(email,password)
})
}


