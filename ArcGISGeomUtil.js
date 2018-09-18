//先只读二维的最普通的shp文件
const Bytes = require('./Bytes');
const GeomType = require('./ArcGISGeomType');

const shpReader = {
    headReader(fileBuffer) {
        //文件编码 9994
        let endIdx = 0;
        let fileCode = fileBuffer.readIntBE(endIdx, Bytes.INT);
        endIdx += Bytes.INT;
        //第四个字节向后的有5个unset 即空的Int4
        endIdx += 5 * Bytes.INT;
        //文件长度
        let fileLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
        endIdx += Bytes.INT;
        //文件编码
        let fileVersion = fileBuffer.readIntLE(endIdx, Bytes.INT);
        endIdx += Bytes.INT;
        //文件要素的几何类型
        let geoType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
        endIdx += Bytes.INT;
        //外包最小x
        let xMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //外包最小y
        let yMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //外包最大x
        let xMax = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //外包最大y
        let yMax = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //外包最小z
        let zMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //外包最大z
        let zMax = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //最小Measure值
        let mMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //最大Measure值
        let mMax = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        return {
            fileCode,
            fileLength,
            fileVersion,
            geoType,
            xMin,
            xMax,
            yMin,
            yMax,
            zMin,
            zMax,
            mMin,
            mMax,
            endIdx
        }
    },
    featuresReader(fileBuffer, type, startIdx) {
        switch (type) {
            case 'Point':
                return this._pointReader(fileBuffer, startIdx);
            case 'PolyLine':
                return this._polylineReader(fileBuffer, startIdx);
            case 'Polygon':
                return this._polygonReader(fileBuffer, startIdx);
            default:
                return
        }
    },
    _polygonReader(fileBuffer, startIdx) {
        let polyGroups = [], endIdx = startIdx;
        while (endIdx < fileBuffer.length) {
            let polygonPart = polygonPartReader(fileBuffer, endIdx);
            polyGroups.push(polygonPart);
            endIdx = polygonPart.endIdx;
        }
        return polyGroups;
    },
    _polylineReader(fileBuffer, startIdx) {
        let lineGroups = [], endIdx = startIdx;
        while (endIdx < fileBuffer.length) {
            let linePart = polylinePartReader(fileBuffer, endIdx);
            lineGroups.push(linePart);
            endIdx = linePart.endIdx;
        }
        return lineGroups;
    },
    _pointReader(fileBuffer, startIdx) {
        let pointGroups = [], endIdx = startIdx;
        while (endIdx < fileBuffer.length) {
            let pointPart = pointPartReader(fileBuffer, endIdx);
            pointGroups.push(pointPart);
            endIdx = pointPart.endIdx;
        }
        return pointGroups;
    }
}
function polygonPartReader(fileBuffer, startIdx) {
    let endIdx = startIdx;
    let recordNumber = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let recordContentLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let shapeType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
    endIdx += Bytes.INT;
    //读这个面的bounds
    let bbox = [];
    for (let bboxIdx = 0; bboxIdx < 4; bboxIdx++) {
        bbox.push(fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE));
        endIdx += Bytes.DOUBLE;
    };
    //读子段的个数
    let childPartsNumber = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //读总点数(x,y)
    let totalPointsLength = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //读每个子面的起始位置
    let childPartsStart = [];
    for (let i = 0; i < childPartsNumber; i++) {
        childPartsStart.push(fileBuffer.readIntLE(endIdx, Bytes.INT));
        endIdx += Bytes.INT;
    }
    //读地理坐标
    let lineArray = [];
    for (let i = 0; i < totalPointsLength; i++) {
        let coordinate = [];
        coordinate[0] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        coordinate[1] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        lineArray.push(coordinate);
    }
    //处理子段部分
    let coordinates = [];
    for (let partnum = 0, len = childPartsStart.length; partnum < len; partnum++) {
        let startIdx = childPartsStart[partnum], endIdx = childPartsStart[partnum + 1];
        if (partnum + 1 === len) {
            coordinates.push([lineArray.slice(startIdx)])
        }
        else {
            coordinates.push([lineArray.slice(startIdx, endIdx)]);
        }
    }
    return {
        recordNumber,
        recordContentLength,
        shapeType,
        bbox,
        childPartsNumber,
        totalPointsLength,
        childPartsStart,
        coordinates,
        endIdx
    }

}
function polylinePartReader(fileBuffer, startIdx) {
    let endIdx = startIdx;
    let recordNumber = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let recordContentLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let shapeType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
    endIdx += Bytes.INT;
    //读这条线的bounds
    let bbox = [];
    for (let bboxIdx = 0; bboxIdx < 4; bboxIdx++) {
        bbox.push(fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE));
        endIdx += Bytes.DOUBLE;
    };
    //读子段的个数
    let childPartsNumber = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //读总点数(x,y)
    let totalPointsLength = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //读每个子段的起始位置
    let childPartsStart = [];
    for (let i = 0; i < childPartsNumber; i++) {
        childPartsStart.push(fileBuffer.readIntLE(endIdx, Bytes.INT));
        endIdx += Bytes.INT;
    }
    //读地理坐标
    let lineArray = [];
    for (let i = 0; i < totalPointsLength; i++) {
        let coordinate = [];
        coordinate[0] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        coordinate[1] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        lineArray.push(coordinate);
    }
    //转换多线的部分
    let coordinates = [];
    if (childPartsStart.length === 1) {
        coordinates = lineArray;
    }
    else {
        for (let partnum = 0, len = childPartsStart.length; partnum < len; partnum++) {
            let startIdx = childPartsStart[partnum], endIdx = childPartsStart[partnum + 1];
            if (partnum + 1 === len) {
                coordinates.push(lineArray.slice(startIdx))
            }
            else {
                coordinates.push(lineArray.slice(startIdx, endIdx));
            }
        }
    }
    return {
        recordNumber,
        recordContentLength,
        shapeType,
        bbox,
        childPartsNumber,
        totalPointsLength,
        childPartsStart,
        coordinates,
        endIdx
    }
}
function pointPartReader(fileBuffer, startIdx) {
    let endIdx = startIdx, coordinate = [];
    let recordNumber = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let recordContentLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let shapeType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
    endIdx += Bytes.INT;
    coordinate[0] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
    endIdx += Bytes.DOUBLE;
    coordinate[1] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
    endIdx += Bytes.DOUBLE;

    return {
        recordNumber,
        recordContentLength,
        shapeType,
        coordinate,
        endIdx
    }

}
module.exports = shpReader;