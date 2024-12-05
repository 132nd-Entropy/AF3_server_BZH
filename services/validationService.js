// services/validationService.js
exports.validateSequence = (type, sequence) => {
    const sequenceMap = {
        Protein: /^[ARNDCEQGHILKMFPSTWYV]+$/i,
        DNA: /^[ATGC]+$/i,
        RNA: /^[AUGC]+$/i,
        Ligand: /^[A-Za-z0-9]+$/,
        Ion: /^[A-Za-z0-9]+$/,
    };
    const regex = sequenceMap[type];
    return regex ? regex.test(sequence) : false;
};
