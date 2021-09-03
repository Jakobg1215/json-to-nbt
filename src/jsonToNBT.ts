import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { TagTypes } from './TagTypes';

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

    const path = join(process.cwd(), file);

    const fileData = readFileSync(path)
        .filter(v => v !== 0x0d && v !== 0x0a)
        .toString();

    let jsonObject;
    try {
        jsonObject = JSON.parse(fileData);
    } catch {
        console.log(`\x1b[31mSyntax Error in file ${file}!\x1b[0m`);
        process.exit(1);
    }

    let nbt = Buffer.alloc(3);
    nbt.writeInt8(TagTypes.COMPOUND);
    const encodeByte = (data: string): Buffer => {
        const byteBuf = Buffer.alloc(1);
        byteBuf.writeInt8(parseInt(data));
        return byteBuf;
    };
    const encodeShort = (data: string): Buffer => {
        const shortBuf = Buffer.alloc(2);
        shortBuf.writeInt16BE(parseInt(data));
        return shortBuf;
    };
    const encodeInt = (data: number): Buffer => {
        const intBuf = Buffer.alloc(4);
        intBuf.writeInt32BE(data);
        return intBuf;
    };
    const encodeLong = (data: string): Buffer => {
        const longBuf = Buffer.alloc(8);
        longBuf.writeBigInt64BE(BigInt(data));
        return longBuf;
    };
    const encodeFloat = (data: string): Buffer => {
        const floatBuf = Buffer.alloc(4);
        floatBuf.writeFloatBE(parseFloat(data));
        return floatBuf;
    };
    const encodeDouble = (data: string): Buffer => {
        const doubleBuf = Buffer.alloc(8);
        doubleBuf.writeDoubleBE(parseFloat(data));
        return doubleBuf;
    };
    const encodeString = (data: string): Buffer => {
        return Buffer.concat([encodeShort(data.length.toString()), Buffer.from(data)]);
    };
    const writeNbtTag = (name: string, type: TagTypes, data: Buffer, isCompound = false): void | Buffer => {
        const tagType = Buffer.alloc(1);
        tagType.writeInt8(type);
        if (isCompound) return Buffer.concat([tagType, encodeString(name), data]);
        nbt = Buffer.concat([nbt, tagType, encodeString(name), data]);
    };
    const writeList = (name: string, data: any[], { isList = false, isCompound = false }): void | Buffer => {
        const listType = Buffer.alloc(1);
        const listData: Buffer[] = [];
        const listFirstItem = data[0];
        const listLength = Buffer.alloc(4);
        listLength.writeInt32BE(data.length);
        switch (typeof listFirstItem) {
            case 'boolean': {
                listType.writeInt8(TagTypes.BYTE);
                data.forEach(bools => {
                    try {
                        listData.push(encodeByte(bools ? '1' : '0'));
                    } catch {
                        console.log(`\x1b[31m${bools} is not type boolean in list ${name}!\x1b[0m`);
                        process.exit(1);
                    }
                });
                break;
            }
            case 'number': {
                listType.writeInt8(TagTypes.INT);
                data.forEach(ints => {
                    try {
                        listData.push(encodeInt(ints));
                    } catch {
                        console.log(`\x1b[31m${ints} is not type integer in list ${name}!\x1b[0m`);
                        process.exit(1);
                    }
                });
                break;
            }
            case 'object': {
                if (listFirstItem === null) {
                    listType.writeInt8(TagTypes.INT);
                    data.forEach(() => {
                        listData.push(encodeInt(0));
                    });
                    break;
                }
                if (Array.isArray(listFirstItem)) {
                    listType.writeInt8(TagTypes.LIST);
                    data.forEach(list => {
                        try {
                            listData.push(writeList('', list, { isList: true })!);
                        } catch {
                            console.log(`\x1b[31m${list} is not type list in list ${name}!\x1b[0m`);
                            process.exit(1);
                        }
                    });
                    break;
                }
                listType.writeInt8(TagTypes.COMPOUND);
                data.forEach(compound => {
                    try {
                        listData.push(writeCompound('', compound, { isList: true })!);
                    } catch {
                        console.log(`\x1b[31m${compound} is not type compound in list ${name}!\x1b[0m`);
                        process.exit(1);
                    }
                });
                break;
            }
            case 'string': {
                if (listFirstItem.match(/[b,s,l,f,d]$/)) {
                    if (!listFirstItem.slice(0, -1).match(/[a-zA-Z]+/g)) {
                        switch (listFirstItem.slice(0, -1)) {
                            case 'b': {
                                listType.writeInt8(TagTypes.BYTE);
                                data.forEach(bytes => {
                                    try {
                                        listData.push(encodeByte(bytes));
                                    } catch {
                                        console.log(`\x1b[31m${bytes} is not type boolean in list ${name}!\x1b[0m`);
                                        process.exit(1);
                                    }
                                });
                                break;
                            }
                            case 's': {
                                listType.writeInt8(TagTypes.SHORT);
                                data.forEach(shorts => {
                                    try {
                                        listData.push(encodeShort(shorts));
                                    } catch {
                                        console.log(`\x1b[31m${shorts} is not type boolean in list ${name}!\x1b[0m`);
                                        process.exit(1);
                                    }
                                });
                                break;
                            }
                            case 'l': {
                                listType.writeInt8(TagTypes.LONG);
                                data.forEach(longs => {
                                    try {
                                        listData.push(encodeLong(longs));
                                    } catch {
                                        console.log(`\x1b[31m${longs} is not type boolean in list ${name}!\x1b[0m`);
                                        process.exit(1);
                                    }
                                });
                                break;
                            }
                            case 'f': {
                                listType.writeInt8(TagTypes.FLOAT);
                                data.forEach(floats => {
                                    try {
                                        listData.push(encodeFloat(floats));
                                    } catch {
                                        console.log(`\x1b[31m${floats} is not type boolean in list ${name}!\x1b[0m`);
                                        process.exit(1);
                                    }
                                });
                                break;
                            }
                            case 'd': {
                                listType.writeInt8(TagTypes.DOUBLE);
                                data.forEach(doubles => {
                                    try {
                                        listData.push(encodeDouble(doubles));
                                    } catch {
                                        console.log(`\x1b[31m${doubles} is not type boolean in list ${name}!\x1b[0m`);
                                        process.exit(1);
                                    }
                                });
                                break;
                            }
                        }
                    }
                }
                listType.writeInt8(TagTypes.STRING);
                data.forEach(strings => {
                    try {
                        listData.push(encodeString(strings));
                    } catch {
                        console.log(`\x1b[31m${strings} is not type boolean in list ${name}!\x1b[0m`);
                        process.exit(1);
                    }
                });
                break;
            }
            case 'undefined': {
                listType.writeInt8(TagTypes.END);
                listData.push(Buffer.alloc(1));
                break;
            }
        }
        const tagType = Buffer.alloc(1);
        tagType.writeInt8(TagTypes.LIST);
        if (isList) return Buffer.concat([listType, listLength, Buffer.concat(listData)]);
        if (isCompound)
            return Buffer.concat([tagType, encodeString(name), listType, listLength, Buffer.concat(listData)]);
        writeNbtTag(name, TagTypes.LIST, Buffer.concat([listType, listLength, Buffer.concat(listData)]));
    };
    const writeCompound = (name: string, compound: any, { isList = false, isCompound = false }): void | Buffer => {
        const compoundEntries: any[] = [];
        for (const data in compound) compoundEntries.push([data, compound[data]]);
        const compoundData: Buffer[] = [];
        compoundEntries.forEach(nbtTag => {
            const nbtTagName: string = nbtTag[0];
            const nbtTagData: any = nbtTag[1];
            switch (typeof nbtTagData) {
                case 'boolean': {
                    compoundData.push(
                        writeNbtTag(nbtTagName, TagTypes.BYTE, encodeByte(nbtTagData ? '1' : '0'), true)!,
                    );
                    break;
                }
                case 'number': {
                    compoundData.push(writeNbtTag(nbtTagName, TagTypes.INT, encodeInt(nbtTagData), true)!);
                    break;
                }
                case 'object': {
                    if (nbtTagData === null) {
                        compoundData.push(writeNbtTag(nbtTagName, TagTypes.INT, encodeInt(0), true)!);
                        break;
                    }
                    if (Array.isArray(nbtTagData)) {
                        compoundData.push(writeList(nbtTagName, nbtTagData, { isCompound: true })!);
                        break;
                    }
                    compoundData.push(writeCompound(nbtTagName, nbtTagData, { isCompound: true })!);
                    break;
                }
                case 'string': {
                    if (nbtTagData.slice(-1).match(/[bslfd]/)) {
                        if (!nbtTagData.slice(0, -1).match(/[a-zA-Z]+/g)) {
                            switch (nbtTagData.slice(-1)) {
                                case 'b': {
                                    compoundData.push(
                                        writeNbtTag(
                                            nbtTagName,
                                            TagTypes.BYTE,
                                            encodeByte(nbtTagData.slice(0, -1)),
                                            true,
                                        )!,
                                    );
                                    break;
                                }
                                case 's': {
                                    compoundData.push(
                                        writeNbtTag(
                                            nbtTagName,
                                            TagTypes.SHORT,
                                            encodeShort(nbtTagData.slice(0, -1)),
                                            true,
                                        )!,
                                    );
                                    break;
                                }
                                case 'l': {
                                    compoundData.push(
                                        writeNbtTag(
                                            nbtTagName,
                                            TagTypes.LONG,
                                            encodeLong(nbtTagData.slice(0, -1)),
                                            true,
                                        )!,
                                    );
                                    break;
                                }
                                case 'f': {
                                    compoundData.push(
                                        writeNbtTag(
                                            nbtTagName,
                                            TagTypes.FLOAT,
                                            encodeFloat(nbtTagData.slice(0, -1)),
                                            true,
                                        )!,
                                    );
                                    break;
                                }
                                case 'd': {
                                    compoundData.push(
                                        writeNbtTag(
                                            nbtTagName,
                                            TagTypes.DOUBLE,
                                            encodeDouble(nbtTagData.slice(0, -1)),
                                            true,
                                        )!,
                                    );
                                    break;
                                }
                            }
                            break;
                        }
                    }
                    compoundData.push(writeNbtTag(nbtTagName, TagTypes.STRING, encodeString(nbtTagData), true)!);
                    break;
                }
            }
        });
        const tagType = Buffer.alloc(1);
        tagType.writeInt8(TagTypes.COMPOUND);
        if (isList) return Buffer.concat([Buffer.concat(compoundData), Buffer.alloc(1)]);
        if (isCompound)
            return Buffer.concat([tagType, encodeString(name), Buffer.concat(compoundData), Buffer.alloc(1)]);
        writeNbtTag(name, TagTypes.COMPOUND, Buffer.concat([Buffer.concat(compoundData), Buffer.alloc(1)]));
    };

    const jsonData: any[] = [];
    for (const data in jsonObject) jsonData.push([data, jsonObject[data]]);
    jsonData.forEach(nbtTag => {
        const nbtTagName: string = nbtTag[0];
        const nbtTagData: any = nbtTag[1];
        switch (typeof nbtTagData) {
            case 'boolean': {
                return writeNbtTag(nbtTagName, TagTypes.BYTE, encodeByte(nbtTagData ? '1' : '0'));
            }
            case 'number': {
                return writeNbtTag(nbtTagName, TagTypes.INT, encodeInt(nbtTagData));
            }
            case 'object': {
                if (nbtTagData === null) {
                    return writeNbtTag(nbtTagName, TagTypes.INT, encodeInt(0));
                }
                if (Array.isArray(nbtTagData)) {
                    return writeList(nbtTagName, nbtTagData, {});
                }
                return writeCompound(nbtTagName, nbtTagData, {});
            }
            case 'string': {
                if (nbtTagData.slice(-1).match(/[bslfd]/)) {
                    if (!nbtTagData.slice(0, -1).match(/[a-zA-Z]+/g)) {
                        switch (nbtTagData.slice(-1)) {
                            case 'b': {
                                return writeNbtTag(nbtTagName, TagTypes.BYTE, encodeByte(nbtTagData.slice(0, -1)));
                            }
                            case 's': {
                                return writeNbtTag(nbtTagName, TagTypes.SHORT, encodeShort(nbtTagData.slice(0, -1)));
                            }
                            case 'l': {
                                return writeNbtTag(nbtTagName, TagTypes.LONG, encodeLong(nbtTagData.slice(0, -1)));
                            }
                            case 'f': {
                                return writeNbtTag(nbtTagName, TagTypes.FLOAT, encodeFloat(nbtTagData.slice(0, -1)));
                            }
                            case 'd': {
                                return writeNbtTag(nbtTagName, TagTypes.DOUBLE, encodeDouble(nbtTagData.slice(0, -1)));
                            }
                        }
                    }
                }
                return writeNbtTag(nbtTagName, TagTypes.STRING, encodeString(nbtTagData));
            }
        }
    });

    nbt = Buffer.concat([nbt, Buffer.alloc(1)]);
    writeFileSync(join(path, `../${file.replace('.json', '.nbt')}`), nbt);
    console.log(`\x1b[32mConverted ${file} to ${file.replace('.json', '.nbt')}!\x1b[0m`);
    process.exit(0);
};
