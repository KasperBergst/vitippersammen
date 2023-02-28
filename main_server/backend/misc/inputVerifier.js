
// checks if the input contains any malicious content
const validateInputs = (listOfInput) => {
	 let allValid = true;

	 listOfInput.forEach(input => {
		  if(!validString(input) && !isEmail(input)){
				allValid = false;
		  }
	 });

	 return allValid;
};

const validateParams = (listOfInput) => {
	 let allValid = true;

	 listOfInput.forEach(input => {
		  if(!validParam(input)){
				allValid = false;
		  }
	 });

	 return allValid;
}

const isEmail = (input) => {
	 input = input.toString();
	 const emailRegex = /^[A-Za-z0-9æøåÆØÅ\_\-]+(\.[A-Za-z0-9æøåÆØÅ\_\-]+)*@[A-Za-z0-9æøåÆØÅ\_\-]+(\.[A-Za-z0-9æøåÆØÅ\_\-]+)*\.[A-Za-z]+$/;

	 if(!input.match(emailRegex)){
		  return false;
	 }
	 return true;
};

const validString = (input) => {
	 input = input.toString();
	 const inputRegex = /^[A-Za-z0-9æøåÆØÅ\.\_\ \-\n]+$/;

	 if(!input.match(inputRegex)){
		  return false;
	 }
	 
	 return true;
}

const validParam = (input) => {
	 input = input.toString();
	 const inputRegex = /^[A-Za-z0-9æøåÆØÅ\.\_\ \-\?=]+$/;

	 if(!input.match(inputRegex)){
		  return false;
	 }
	 
	 return true;
}

export { 
	 validateInputs,
	 validateParams,
	 isEmail
};