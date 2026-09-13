/* Gotland Sea Trout v6.2.4 numeric current test */
async function loadNumericGridFile(){
 const response=await fetch('data/current/latest.json');
 return response.json();
}
console.info('v6.2.4 numeric current module loaded');
