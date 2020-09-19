export default function pair(activeMembers) {
  let shuffledArray = activeMembers.map(e => ({email: e.email, name: e.name}));

  for(let i = shuffledArray.length-1; i > 0; i--){
    const j = Math.floor(Math.random() * i);
    const temp = shuffledArray[i];
    shuffledArray[i] = shuffledArray[j];
    shuffledArray[j] = temp;
  }

  let pairs = [];
  let i = shuffledArray.length-1;
  while(i>=0) {
    if(i>=1){
      let pair = [shuffledArray[i], shuffledArray[i-1]];
      pairs.push(pair);
      i = i -2;
    }
    else if(i==0){
      let pair = [shuffledArray[i], shuffledArray[i+1]];
      pairs.push(pair);
      i--;
    }
  }

  return pairs;
}