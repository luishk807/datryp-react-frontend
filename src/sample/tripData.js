export const multiTripDetailobj = {
    name: 'All asian!',
    organizer: 'joa',
    type: 'multiple',
    budget: 2500,
    total: 5000,
    startDate: '01/01/2023',
    endDate: '01/10/2023',
    note: '',
    people: 2,
    status: 1,
    destinations: [
        {
            country: {
                id: '1',
                name: 'China'
            },
            flightInfo: [
                {
                    date: '01/01/2023',
                    type: 'arrival',
                    airport: 'JFF Aiport',
                    flight: 'ADD-140',
                    time: '10:00am',
                },
                {
                    date: '01/01/2023',
                    type: 'depart',
                    airport: 'DFF',
                    flight: 'AGF-140',
                    time: '1:00pm',
                }
            ],
            note: '',
            intineraries: [
                {
                    date: '01/01/2023',
                    activities: null  
                },
                {
                    date: '01/01/2023',
                    activities: [
                        {
                            name: 'Glass Bridge',
                            status: 1,
                            location: 'china, guahnzhow',
                            startTime: '9:00am',
                            image: {
                                url: '/images/sample/china2.jpg',
                                name: 'china2',
                            },
                            endTime: '9:30am',
                            people: '2',
                            cost: '150',
                            shareCost: [
                                {
                                    name: 'luis',
                                    amount: '100',
                                    status: 'not paid'
                                },
                                {
                                    name: 'joanana',
                                    amount: '50',
                                    status: 'paid'
                                }
                            ]
                        },
                        {
                            name: 'Kings Castle',
                            status: 1,
                            location: 'china, guahnzhow',
                            startTime: '9:00am',
                            endTime: '9:30am',
                            image: {
                                url: '/images/sample/china1.jpg',
                                name: 'china1',
                            },
                            people: '2',
                            cost: '150',
                            shareCost: [
                                {
                                    name: 'luis',
                                    amount: '100',
                                    status: 'not paid'
                                },
                                {
                                    name: 'joanana',
                                    amount: '50',
                                    status: 'paid'
                                }
                            ]
                        },
                    ]
                },
            ]
        },
        {
            country: {
                id: '2',
                name: 'Vietnam'
            },
            flightInfo: [
                {
                    date: '01/01/2023',
                    type: 'arrival',
                    airport: 'JFF Aiport',
                    flight: 'ADD-140',
                    time: '10:00am',
                },
                {
                    date: '01/01/2023',
                    type: 'depart',
                    airport: 'DFF',
                    flight: 'AGF-140',
                    time: '1:00pm',
                }
            ],
            note: '',
            intineraries: [
                {
                    date: '01/02/2023',
                    activities: [
                        {
                            name: 'Yatch vietnam',
                            status: 1,
                            location: 'Hoi Nam',
                            startTime: '9:00am',
                            endTime: '9:30am',
                            image: {
                                url: '/images/sample/vietnam.jpg',
                                name: 'vietnam',
                            },
                            people: '2',
                            cost: '250',
                            shareCost: [
                                {
                                    name: 'luis',
                                    amount: '100',
                                    status: 'not paid'
                                },
                                {
                                    name: 'joanana',
                                    amount: '50',
                                    status: 'paid'
                                }
                            ]
                        },
                    ]
                },
            ]
        }
    ],

};

// export const singleTripDetailobj = {
//     name: 'All asian!',
//     organizer: 'joa',
//     budget: 2500,
//     total: 5000,
//     type: 'single',
//     startDate: '01/01/2023',
//     endDate: '01/10/2023',
//     note: '',
//     people: 2,
//     status: 1,
//     destinations: [
//         {
//             country: {
//                 id: 1,
//                 name: 'China'
//             },
//             flightInfo: [
//                 {
//                     date: '01/01/2023',
//                     type: 'arrival',
//                     airport: 'JFF Aiport',
//                     flight: 'ADD-140',
//                     time: '10:00am',
//                 },
//                 {
//                     date: '01/01/2023',
//                     type: 'depart',
//                     airport: 'DFF',
//                     flight: 'AGF-140',
//                     time: '1:00pm',
//                 }
//             ],
//             note: '',
//             itinerary: [
//                 {
//                     date: '07/07/2024',
//                     activities: null  
//                 },
//                 {
//                     date: '07/09/2024',
//                     activities: [
//                         {
//                             name: 'Glass Bridge',
//                             status: 1,
//                             location: 'china, guahnzhow',
//                             startTime: '9:00am',
//                             image: {
//                                 url: '/images/sample/china2.jpg',
//                                 name: 'china2',
//                             },
//                             endTime: '9:30am',
//                             people: [
//                                 {
//                                     id: '1',
//                                     name: 'joanna'
//                                 },
//                                 {
//                                     id: '2',
//                                     name: 'Luis'
//                                 },
//                             ],
//                             cost: '150',
//                             shareCost: [
//                                 {
//                                     name: 'luis',
//                                     amount: '100',
//                                     status: 'not paid'
//                                 },
//                                 {
//                                     name: 'joanana',
//                                     amount: '50',
//                                     status: 'paid'
//                                 }
//                             ]
//                         },
//                         {
//                             name: 'Kings Castle',
//                             status: 1,
//                             location: 'china, guahnzhow',
//                             startTime: '9:00am',
//                             endTime: '9:30am',
//                             image: {
//                                 url: '/images/sample/china1.jpg',
//                                 name: 'china1',
//                             },
//                             people: [
//                                 {
//                                     id: '1',
//                                     name: 'joanna'
//                                 },
//                                 {
//                                     id: '2',
//                                     name: 'Luis'
//                                 },
//                             ],
//                             cost: '150',
//                             shareCost: [
//                                 {
//                                     name: 'luis',
//                                     amount: '100',
//                                     status: 'not paid'
//                                 },
//                                 {
//                                     name: 'joanana',
//                                     amount: '50',
//                                     status: 'paid'
//                                 }
//                             ]
//                         },
//                     ]
//                 },
//             ]
//         }
//     ],

// };
export const singleTripDetailobj = null;