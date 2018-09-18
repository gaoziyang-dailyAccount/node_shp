
const Bytes = require('./Bytes');
const GeomType = require('./ArcGISGeomType');

const shpReader = {

    /**
     * @description read *.shp's header information
     * @author gaozy
     * @param {*} fileBuffer
     * @returns
     */
    headReader(fileBuffer) {
        //filecode 9994
        let endIdx = 0;
        let fileCode = fileBuffer.readIntBE(endIdx, Bytes.INT);
        endIdx += Bytes.INT;
        //unset 
        endIdx += 5 * Bytes.INT;
        //file length
        let fileLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
        endIdx += Bytes.INT;
        //file version
        let fileVersion = fileBuffer.readIntLE(endIdx, Bytes.INT);
        endIdx += Bytes.INT;
        //shape type
        let geoType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
        endIdx += Bytes.INT;
        //bounds minX
        let xMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //bounds minY
        let yMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //bounds maxX
        let xMax = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //bounds maxY
        let yMax = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //bounds minZ
        let zMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //bounds maxZ
        let zMax = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        ///bounds minM
        let mMin = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        //bounds maxM
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

    /**
     * @description read *.shp's shape information
     * @author gaozy
     * @param {*} fileBuffer
     * @param {*} type
     * @param {*} startIdx
     * @returns
     */
    featuresReader(fileBuffer, type, startIdx) {
        switch (type) {
            case 'Point':
                return this._pointReader(fileBuffer, startIdx);
            case 'PolyLine':
                return this._polylineReader(fileBuffer, startIdx);
            case 'Polygon':
                return this._polygonReader(fileBuffer, startIdx);
            case 'Null Shape':
                return this._nullShapeReader(fileBuffer, startIdx);
            default:
                return
        }
    },

    /**
     * @description return null shape object
     * @author gaozy
     * @param {*} fileBuffer
     * @param {*} startIdx
     * @returns
     */
    _nullShapeReader(fileBuffer, startIdx) {
        return {
            error: true,
            message : 'Null Shape'
        }
    }

    /**
     * @description read polygon shape
     * @author gaozy
     * @param {*} fileBuffer
     * @param {*} startIdx
     * @returns
     */
    _polygonReader(fileBuffer, startIdx) {
        let polyGroups = [], endIdx = startIdx;
        while (endIdx < fileBuffer.length) {
            let polygonPart = polygonPartReader(fileBuffer, endIdx);
            polyGroups.push(polygonPart);
            endIdx = polygonPart.endIdx;
        }
        return polyGroups;
    },

    /**
     * @description read linestring shape
     * @author gaozy
     * @param {*} fileBuffer
     * @param {*} startIdx
     * @returns
     */
    _polylineReader(fileBuffer, startIdx) {
        let lineGroups = [], endIdx = startIdx;
        while (endIdx < fileBuffer.length) {
            let linePart = polylinePartReader(fileBuffer, endIdx);
            lineGroups.push(linePart);
            endIdx = linePart.endIdx;
        }
        return lineGroups;
    },

    /**
     * @description read point shape
     * @author gaozy
     * @param {*} fileBuffer
     * @param {*} startIdx
     * @returns
     */
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

/**
 * @description read one polygon
 * @author gaozy
 * @param {*} fileBuffer
 * @param {*} startIdx
 * @returns
 */
function polygonPartReader(fileBuffer, startIdx) {
    let endIdx = startIdx;
    let recordNumber = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let recordContentLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let shapeType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
    endIdx += Bytes.INT;
    //read bounds
    let bbox = [];
    for (let bboxIdx = 0; bboxIdx < 4; bboxIdx++) {
        bbox.push(fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE));
        endIdx += Bytes.DOUBLE;
    };
    //read children parts' number
    let childPartsNumber = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //read total points => (x, y)
    let totalPointsLength = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //read children polygon start index
    let childPartsStart = [];
    for (let i = 0; i < childPartsNumber; i++) {
        childPartsStart.push(fileBuffer.readIntLE(endIdx, Bytes.INT));
        endIdx += Bytes.INT;
    }
    //read coordinates
    let lineArray = [];
    for (let i = 0; i < totalPointsLength; i++) {
        let coordinate = [];
        coordinate[0] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        coordinate[1] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        lineArray.push(coordinate);
    }
    //parse coordinates to geojson coordinates
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

/**
 * @description read one linestring
 * @author gaozy
 * @param {*} fileBuffer
 * @param {*} startIdx
 * @returns
 */
function polylinePartReader(fileBuffer, startIdx) {
    let endIdx = startIdx;
    let recordNumber = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let recordContentLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let shapeType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
    endIdx += Bytes.INT;
    //read bounds
    let bbox = [];
    for (let bboxIdx = 0; bboxIdx < 4; bboxIdx++) {
        bbox.push(fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE));
        endIdx += Bytes.DOUBLE;
    };
    //read children parts' numbers
    let childPartsNumber = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //read total points' numbers
    let totalPointsLength = fileBuffer.readIntLE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    //read children parts' start index
    let childPartsStart = [];
    for (let i = 0; i < childPartsNumber; i++) {
        childPartsStart.push(fileBuffer.readIntLE(endIdx, Bytes.INT));
        endIdx += Bytes.INT;
    }
    //read coordinates
    let lineArray = [];
    for (let i = 0; i < totalPointsLength; i++) {
        let coordinate = [];
        coordinate[0] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        coordinate[1] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
        endIdx += Bytes.DOUBLE;
        lineArray.push(coordinate);
    }
    //parse coordinates to geojson coordinates
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

/**
 * @description read one point
 * @author gaozy
 * @param {*} fileBuffer
 * @param {*} startIdx
 * @returns
 */
function pointPartReader(fileBuffer, startIdx) {
    let endIdx = startIdx, coordinate = [];
    let recordNumber = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let recordContentLength = fileBuffer.readIntBE(endIdx, Bytes.INT);
    endIdx += Bytes.INT;
    let shapeType = GeomType[fileBuffer.readIntLE(endIdx, Bytes.INT)];
    endIdx += Bytes.INT;
    //read x
    coordinate[0] = fileBuffer.readDoubleLE(endIdx, Bytes.DOUBLE);
    endIdx += Bytes.DOUBLE;
    //read y
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