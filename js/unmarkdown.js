import removeMd from 'remove-markdown';

const markdown = '# This is a heading\n\nThis is a paragraph Fixes #23 with [a link](http://www.disney.com/) in it.';
const plainText = removeMd(markdown);
console.log(plainText); 
