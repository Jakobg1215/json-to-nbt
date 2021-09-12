# json-to-nbt
A converter to convert json to nbt!

# install
```bash
npm i json-to-nbt -g
```

# Usage
### cli
```bash
json-to-nbt <file>
```
```bash
json-to-nbt <path to file>
```
---
### cli options

| Option     | Default Value | Description                           |
| ---------- | ------------- | --------------------------------------|
| --name     | `''`          | Specify the name of the first compound|
| --compress | false         | Commpresses the nbt file with gzip    |

### javascript
```js
const { jsonToNBT } = require('json-to-nbt');
```
### typescript
```ts
import { jsonToNBT } from 'json-to-nbt';
```
# Development
- [ ] split fuctions into mutilple files
- [x] allow use as a lib
- [x] first compound naming
- [ ] compression

Please report any bugs found in bug reports
