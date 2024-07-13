export const isSingleTrip = (type) => {
    return type === 1 ? true : false;
};

export const convertMoney = (value) => {
    let usDollar = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    });

    return usDollar.format(value);
};