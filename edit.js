const fs = require('fs');
const file = process.argv[2];
const content = fs.readFileSync(file, 'utf8');

if (file.includes('git-rebase-todo')) {
  // Replace the first 'pick' with 'reword'
  const newContent = content.replace(/^pick/m, 'reword');
  fs.writeFileSync(file, newContent);
} else if (file.includes('COMMIT_EDITMSG')) {
  fs.writeFileSync(file, 'Rect v1.0.0 Release: Just made it.\n');
}
