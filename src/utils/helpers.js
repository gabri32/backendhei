module.exports = {
    formatDate: (date) => {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return new Intl.DateTimeFormat('en-US', options).format(date);
    },

    generateRandomId: (length) => {
        return Math.random().toString(36).substr(2, length);
    },

    capitalizeFirstLetter: (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
};