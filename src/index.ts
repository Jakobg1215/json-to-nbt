import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { rootTypes } from './rootTypes';

export default () => {
    const file = process.argv[2];
    if (!file) {
        console.log('\x1b[31mFile not specified!\x1b[0m');
        process.exit(1);
    }

    if (!file.endsWith('.json')) {
        console.log('\x1b[31mFile is not type JSON!\x1b[0m');
        process.exit(1);
    }

    const location = process.cwd();

    const path = join(location, file);

    const fileData = readFileSync(path)
        .filter(v => v !== 0x0d && v !== 0x0a)
        .toString();

    try {
        JSON.parse(fileData);
    } catch (error) {
        try {
            console.log(`\x1b[31mSyntax error at position ${error.message.match(/\d+/g).at(0)}!\x1b[0m`);
        } catch {
            console.log(`\x1b[31mError at file ${file}!\x1b[0m`);
        }
        process.exit(1);
    }

    let nbt = Buffer.alloc(3);
    nbt.writeInt8(10);
    const jsonObject = JSON.parse(fileData);
    const jsonData: any[] = [];

    for (const data in jsonObject) jsonData.push([data, jsonObject[data]]);

    const addNBTData = (data: Buffer) => {
        nbt = Buffer.concat([nbt, data]);
    };

    const readObjectNBT = (name: string, value: any) => {
        const objectData: any[] = [];
        for (const data in value) objectData.push([data, value[data]]);
        const compoundNameLength = Buffer.alloc(3);
        compoundNameLength.writeInt8(rootTypes.COMPOUND);
        compoundNameLength.writeUInt16BE(name.length, 1);
        addNBTData(Buffer.concat([compoundNameLength, Buffer.from(name)]));
        objectData.forEach(value => {
            const rootNameLength = Buffer.alloc(2);
            rootNameLength.writeUInt16BE(value[0].length);
            const rootName = Buffer.concat([rootNameLength, Buffer.from(value[0])]);
            switch (typeof value[1]) {
                case 'string': {
                    if (value[1].slice(-1).match(/[bslfd]/)) {
                        if (!value[1].slice(0, -1).match(/[a-zA-Z]+/g)) {
                            switch (value[1].slice(-1)) {
                                case 'b': {
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.BYTE);
                                    const rootData = Buffer.alloc(1);
                                    rootData.writeInt8(Number(value[1].slice(0, -1)));
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                                case 's': {
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.SHORT);
                                    const rootData = Buffer.alloc(2);
                                    rootData.writeInt16BE(Number(value[1].slice(0, -1)));
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                                case 'l': {
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.LONG);
                                    const rootData = Buffer.alloc(8);
                                    rootData.writeBigInt64BE(BigInt(Number(value[1].slice(0, -1))));
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                                case 'f': {
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.FLOAT);
                                    const rootData = Buffer.alloc(4);
                                    rootData.writeFloatBE(Number(value[1].slice(0, -1)));
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                                case 'd': {
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.DOUBLE);
                                    const rootData = Buffer.alloc(8);
                                    rootData.writeDoubleBE(Number(value[1].slice(0, -1)));
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                            }
                            break;
                        }
                    }
                    const rootType = Buffer.alloc(1);
                    rootType.writeInt8(rootTypes.STRING);
                    const rootLength = Buffer.alloc(2);
                    rootLength.writeUInt16BE(value[1].length);
                    const rootData = Buffer.concat([rootLength, Buffer.from(value[1])]);
                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                    break;
                }
                case 'number': {
                    const rootType = Buffer.alloc(1);
                    rootType.writeInt8(rootTypes.INT);
                    const rootData = Buffer.alloc(4);
                    rootData.writeInt32BE(value[1]);
                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                    break;
                }
                case 'boolean': {
                    const rootType = Buffer.alloc(1);
                    rootType.writeInt8(rootTypes.BYTE);
                    const rootData = Buffer.alloc(1);
                    rootData.writeInt8(value ? 1 : 0);
                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                    break;
                }
                case 'object': {
                    if (Array.isArray(value[1])) {
                        switch (typeof value[1][0]) {
                            case 'string': {
                                if (value[1][0].slice(-1).match(/[bslfd]/)) {
                                    if (!value[1][0].slice(0, -1).match(/[a-zA-Z]+/g)) {
                                        switch (value[1][0].slice(-1)) {
                                            case 'b': {
                                                readListNBT(value[0], 'byte', value[1]);
                                                break;
                                            }
                                            case 's': {
                                                readListNBT(value[0], 'short', value[1]);
                                                break;
                                            }
                                            case 'l': {
                                                readListNBT(value[0], 'long', value[1]);
                                                break;
                                            }
                                            case 'f': {
                                                readListNBT(value[0], 'float', value[1]);
                                                break;
                                            }
                                            case 'd': {
                                                readListNBT(value[0], 'double', value[1]);
                                                break;
                                            }
                                        }
                                        break;
                                    }
                                }
                                readListNBT(value[0], 'string', value[1]);
                                break;
                            }
                            case 'number': {
                                readListNBT(value[0], 'int', value[1]);
                                break;
                            }
                            case 'boolean': {
                                readListNBT(value[0], 'boolean', value[1]);
                                break;
                            }
                            case 'object': {
                                if (Array.isArray(value[1][0])) {
                                    readListNBT(value[0], 'array', value[1]);
                                    break;
                                }
                                if (value[1][0] === null) {
                                    readListNBT(value[0], 'null', value[1]);
                                    break;
                                }
                                readListNBT(value[0], 'object', value[1]);
                                break;
                            }
                            default: {
                                readListNBT(value[0], 'empty', value[1]);
                            }
                        }
                        break;
                    }
                    if (value[1] === null) {
                        const rootType = Buffer.alloc(1);
                        rootType.writeInt8(rootTypes.INT);
                        const rootData = Buffer.alloc(4);
                        rootData.writeInt32BE(0);
                        addNBTData(Buffer.concat([rootType, rootName, rootData]));
                        break;
                    }
                    readObjectNBT(value[0], value[1]);
                    break;
                }
            }
        });
        addNBTData(Buffer.alloc(1));
    };

    const readListNBT = (name: string, type: string, value: any[]) => {
        const listNameLength = Buffer.alloc(3);
        listNameLength.writeInt8(rootTypes.LIST);
        listNameLength.writeUInt16BE(name.length, 1);
        addNBTData(Buffer.concat([listNameLength, Buffer.from(name)]));
        const listType = Buffer.alloc(1);
        const listLength = Buffer.alloc(4);
        listLength.writeInt32BE(value.length);
        try {
            switch (type) {
                case 'byte': {
                    listType.writeInt8(rootTypes.BYTE);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootData = Buffer.alloc(1);
                        rootData.writeInt8(parseInt(value.slice(0, -1)));
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'short': {
                    listType.writeInt8(rootTypes.SHORT);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootData = Buffer.alloc(2);
                        rootData.writeInt16BE(parseInt(value.slice(0, -1)));
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'long': {
                    listType.writeInt8(rootTypes.LONG);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootData = Buffer.alloc(8);
                        rootData.writeBigInt64BE(BigInt(parseInt(value.slice(0, -1))));
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'float': {
                    listType.writeInt8(rootTypes.FLOAT);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootData = Buffer.alloc(4);
                        rootData.writeFloatBE(parseFloat(value.slice(0, -1)));
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'double': {
                    listType.writeInt8(rootTypes.DOUBLE);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootData = Buffer.alloc(8);
                        rootData.writeDoubleBE(parseFloat(value.slice(0, -1)));
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'string': {
                    listType.writeInt8(rootTypes.STRING);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootLength = Buffer.alloc(2);
                        rootLength.writeInt16BE(value.length);
                        addNBTData(Buffer.concat([rootLength, Buffer.from(value)]));
                    });
                    break;
                }
                case 'int': {
                    listType.writeInt8(rootTypes.INT);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootData = Buffer.alloc(4);
                        rootData.writeInt32BE(value);
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'boolean': {
                    listType.writeInt8(rootTypes.BYTE);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const rootData = Buffer.alloc(1);
                        rootData.writeInt8(value);
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'array': {
                    listType.writeInt8(rootTypes.LIST);
                    console.log(`\x1b[31mSorry but arrays do not support nested arrays yet.\x1b[0m`);
                    process.exit(1);
                }
                case 'null': {
                    listType.writeInt8(rootTypes.INT);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(() => {
                        const rootData = Buffer.alloc(4);
                        addNBTData(rootData);
                    });
                    break;
                }
                case 'object': {
                    listType.writeInt8(rootTypes.COMPOUND);
                    addNBTData(Buffer.concat([listType, listLength]));
                    value.forEach(value => {
                        const objectData: any[] = [];
                        for (const data in value) objectData.push([data, value[data]]);
                        objectData.forEach(value => {
                            const rootNameLength = Buffer.alloc(2);
                            rootNameLength.writeUInt16BE(value[0].length);
                            const rootName = Buffer.concat([rootNameLength, Buffer.from(value[0])]);
                            switch (typeof value[1]) {
                                case 'string': {
                                    if (value[1].slice(-1).match(/[bslfd]/)) {
                                        if (!value[1].slice(0, -1).match(/[a-zA-Z]+/g)) {
                                            switch (value[1].slice(-1)) {
                                                case 'b': {
                                                    const rootType = Buffer.alloc(1);
                                                    rootType.writeInt8(rootTypes.BYTE);
                                                    const rootData = Buffer.alloc(1);
                                                    rootData.writeInt8(Number(value[1].slice(0, -1)));
                                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                                    break;
                                                }
                                                case 's': {
                                                    const rootType = Buffer.alloc(1);
                                                    rootType.writeInt8(rootTypes.SHORT);
                                                    const rootData = Buffer.alloc(2);
                                                    rootData.writeInt16BE(Number(value[1].slice(0, -1)));
                                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                                    break;
                                                }
                                                case 'l': {
                                                    const rootType = Buffer.alloc(1);
                                                    rootType.writeInt8(rootTypes.LONG);
                                                    const rootData = Buffer.alloc(8);
                                                    rootData.writeBigInt64BE(BigInt(Number(value[1].slice(0, -1))));
                                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                                    break;
                                                }
                                                case 'f': {
                                                    const rootType = Buffer.alloc(1);
                                                    rootType.writeInt8(rootTypes.FLOAT);
                                                    const rootData = Buffer.alloc(4);
                                                    rootData.writeFloatBE(Number(value[1].slice(0, -1)));
                                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                                    break;
                                                }
                                                case 'd': {
                                                    const rootType = Buffer.alloc(1);
                                                    rootType.writeInt8(rootTypes.DOUBLE);
                                                    const rootData = Buffer.alloc(8);
                                                    rootData.writeDoubleBE(Number(value[1].slice(0, -1)));
                                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                    }
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.STRING);
                                    const rootLength = Buffer.alloc(2);
                                    rootLength.writeUInt16BE(value[1].length);
                                    const rootData = Buffer.concat([rootLength, Buffer.from(value[1])]);
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                                case 'number': {
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.INT);
                                    const rootData = Buffer.alloc(4);
                                    rootData.writeInt32BE(value[1]);
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                                case 'boolean': {
                                    const rootType = Buffer.alloc(1);
                                    rootType.writeInt8(rootTypes.BYTE);
                                    const rootData = Buffer.alloc(1);
                                    rootData.writeInt8(value ? 1 : 0);
                                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                    break;
                                }
                                case 'object': {
                                    if (Array.isArray(value[1])) {
                                        switch (typeof value[1][0]) {
                                            case 'string': {
                                                if (value[1][0].slice(-1).match(/[bslfd]/)) {
                                                    if (!value[1][0].slice(0, -1).match(/[a-zA-Z]+/g)) {
                                                        switch (value[1][0].slice(-1)) {
                                                            case 'b': {
                                                                readListNBT(value[0], 'byte', value[1]);
                                                                break;
                                                            }
                                                            case 's': {
                                                                readListNBT(value[0], 'short', value[1]);
                                                                break;
                                                            }
                                                            case 'l': {
                                                                readListNBT(value[0], 'long', value[1]);
                                                                break;
                                                            }
                                                            case 'f': {
                                                                readListNBT(value[0], 'float', value[1]);
                                                                break;
                                                            }
                                                            case 'd': {
                                                                readListNBT(value[0], 'double', value[1]);
                                                                break;
                                                            }
                                                        }
                                                        break;
                                                    }
                                                }
                                                readListNBT(value[0], 'string', value[1]);
                                                break;
                                            }
                                            case 'number': {
                                                readListNBT(value[0], 'int', value[1]);
                                                break;
                                            }
                                            case 'boolean': {
                                                readListNBT(value[0], 'boolean', value[1]);
                                                break;
                                            }
                                            case 'object': {
                                                if (Array.isArray(value[1][0])) {
                                                    readListNBT(value[0], 'array', value[1]);
                                                    break;
                                                }
                                                if (value[1][0] === null) {
                                                    readListNBT(value[0], 'null', value[1]);
                                                    break;
                                                }
                                                readListNBT(value[0], 'object', value[1]);
                                                break;
                                            }
                                            default: {
                                                readListNBT(value[0], 'empty', value[1]);
                                            }
                                        }
                                        break;
                                    }
                                    if (value[1] === null) {
                                        const rootType = Buffer.alloc(1);
                                        rootType.writeInt8(rootTypes.INT);
                                        const rootData = Buffer.alloc(4);
                                        rootData.writeInt32BE(0);
                                        addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                        break;
                                    }
                                    readObjectNBT(value[0], value[1]);
                                    break;
                                }
                            }
                        });
                        addNBTData(Buffer.alloc(1));
                    });
                    break;
                }
                case 'empty': {
                    listType.writeInt8(rootTypes.END);
                    const rootData = Buffer.alloc(0);
                    addNBTData(Buffer.concat([listType, listLength, rootData]));
                    break;
                }
            }
        } catch {
            console.log(`\x1b[31mEvery item in list ${name} must be type ${type}! ${value}\x1b[0m`);
            process.exit(1);
        }
    };

    jsonData.forEach(value => {
        const rootNameLength = Buffer.alloc(2);
        rootNameLength.writeUInt16BE(value[0].length);
        const rootName = Buffer.concat([rootNameLength, Buffer.from(value[0])]);
        switch (typeof value[1]) {
            case 'string': {
                if (value[1].slice(-1).match(/[bslfd]/)) {
                    if (!value[1].slice(0, -1).match(/[a-zA-Z]+/g)) {
                        switch (value[1].slice(-1)) {
                            case 'b': {
                                const rootType = Buffer.alloc(1);
                                rootType.writeInt8(rootTypes.BYTE);
                                const rootData = Buffer.alloc(1);
                                rootData.writeInt8(Number(value[1].slice(0, -1)));
                                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                break;
                            }
                            case 's': {
                                const rootType = Buffer.alloc(1);
                                rootType.writeInt8(rootTypes.SHORT);
                                const rootData = Buffer.alloc(2);
                                rootData.writeInt16BE(Number(value[1].slice(0, -1)));
                                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                break;
                            }
                            case 'l': {
                                const rootType = Buffer.alloc(1);
                                rootType.writeInt8(rootTypes.LONG);
                                const rootData = Buffer.alloc(8);
                                rootData.writeBigInt64BE(BigInt(Number(value[1].slice(0, -1))));
                                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                break;
                            }
                            case 'f': {
                                const rootType = Buffer.alloc(1);
                                rootType.writeInt8(rootTypes.FLOAT);
                                const rootData = Buffer.alloc(4);
                                rootData.writeFloatBE(Number(value[1].slice(0, -1)));
                                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                break;
                            }
                            case 'd': {
                                const rootType = Buffer.alloc(1);
                                rootType.writeInt8(rootTypes.DOUBLE);
                                const rootData = Buffer.alloc(8);
                                rootData.writeDoubleBE(Number(value[1].slice(0, -1)));
                                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                                break;
                            }
                        }
                        break;
                    }
                }
                const rootType = Buffer.alloc(1);
                rootType.writeInt8(rootTypes.STRING);
                const rootLength = Buffer.alloc(2);
                rootLength.writeUInt16BE(value[1].length);
                const rootData = Buffer.concat([rootLength, Buffer.from(value[1])]);
                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                break;
            }
            case 'number': {
                const rootType = Buffer.alloc(1);
                rootType.writeInt8(rootTypes.INT);
                const rootData = Buffer.alloc(4);
                rootData.writeInt32BE(value[1]);
                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                break;
            }
            case 'boolean': {
                const rootType = Buffer.alloc(1);
                rootType.writeInt8(rootTypes.BYTE);
                const rootData = Buffer.alloc(1);
                rootData.writeInt8(value ? 1 : 0);
                addNBTData(Buffer.concat([rootType, rootName, rootData]));
                break;
            }
            case 'object': {
                if (Array.isArray(value[1])) {
                    switch (typeof value[1][0]) {
                        case 'string': {
                            if (value[1][0].slice(-1).match(/[bslfd]/)) {
                                if (!value[1][0].slice(0, -1).match(/[a-zA-Z]+/g)) {
                                    switch (value[1][0].slice(-1)) {
                                        case 'b': {
                                            readListNBT(value[0], 'byte', value[1]);
                                            break;
                                        }
                                        case 's': {
                                            readListNBT(value[0], 'short', value[1]);
                                            break;
                                        }
                                        case 'l': {
                                            readListNBT(value[0], 'long', value[1]);
                                            break;
                                        }
                                        case 'f': {
                                            readListNBT(value[0], 'float', value[1]);
                                            break;
                                        }
                                        case 'd': {
                                            readListNBT(value[0], 'double', value[1]);
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                            readListNBT(value[0], 'string', value[1]);
                            break;
                        }
                        case 'number': {
                            readListNBT(value[0], 'int', value[1]);
                            break;
                        }
                        case 'boolean': {
                            readListNBT(value[0], 'boolean', value[1]);
                            break;
                        }
                        case 'object': {
                            if (Array.isArray(value[1][0])) {
                                readListNBT(value[0], 'array', value[1]);
                                break;
                            }
                            if (value[1][0] === null) {
                                readListNBT(value[0], 'null', value[1]);
                                break;
                            }
                            readListNBT(value[0], 'object', value[1]);
                            break;
                        }
                        default: {
                            readListNBT(value[0], 'empty', value[1]);
                        }
                    }
                    break;
                }
                if (value[1] === null) {
                    const rootType = Buffer.alloc(1);
                    rootType.writeInt8(rootTypes.INT);
                    const rootData = Buffer.alloc(4);
                    rootData.writeInt32BE(0);
                    addNBTData(Buffer.concat([rootType, rootName, rootData]));
                    break;
                }
                readObjectNBT(value[0], value[1]);
                break;
            }
        }
    });

    addNBTData(Buffer.alloc(1));

    writeFileSync(join(path, `../${file.replace('.json', '.nbt')}`), nbt);

    console.log(`\x1b[32mConverted ${file} to ${file.replace('.json', '.nbt')}!\x1b[0m`);
};
