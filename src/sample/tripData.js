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

export const multiTripDetailobj2 = {
    "type": {
        "id": 2,
        "name": "Multiple",
        "route": "/multiple",
        "steps": {
            "BASIC": 0,
            "FRIEND": 1,
            "FINISH": 2
        }
    },
    "status": {
        id: 1,
        name: 'active'
    },
    "destinations": [
        {
            "country": {
                "id": 0,
                "name": "Chile",
                "code": "CL",
                "local": "Chili (le)"
            },
            "flightInfo": {
                "departDate": "2024-09-30",
                "departTime": "15:38",
                "arrivalDate": "2024-09-30",
                "arrivalTime": "15:38",
                "flightNumber": "5t",
                "departAirport": "test",
                "arrivalAirport": "test"
            },
            "date": "2024-09-07",
            "id": 0,
            "itinerary": [
                {
                    "id": 1,
                    "date": "2024-09-07",
                    "activities": [
                        {
                            "startTime": "15:38",
                            "endTime": "15:38",
                            "status": {
                                "id": 3,
                                "name": "Pending"
                            },
                            "place": "test",
                            "location": "test",
                            "cost": "111",
                            "note": "test",
                            "id": 0
                        }
                    ]
                }
            ]
        },
        {
            "country": {
                "id": 0,
                "name": "American Samoa",
                "code": "AS",
                "local": "Samoa américaines (les)"
            },
            "flightInfo": {
                "departDate": "2024-09-30",
                "departTime": "15:38",
                "arrivalDate": "2024-09-30",
                "arrivalTime": "15:38",
                "flightNumber": "5t",
                "departAirport": "test",
                "arrivalAirport": "test"
            },
            "date": "2024-09-07",
            "id": 1,
            "itinerary": [
                {
                    "id": 2,
                    "date": "2024-09-07",
                    "activities": [
                        {
                            "startTime": "15:38",
                            "endTime": "15:38",
                            "status": {
                                "id": 3,
                                "name": "Pending"
                            },
                            "place": "test",
                            "location": "test1",
                            "cost": "1111",
                            "id": 1
                        },
                        {
                            "startTime": "15:38",
                            "endTime": "15:38",
                            "status": {
                                "id": 3,
                                "name": "Pending"
                            },
                            "place": "test2",
                            "location": "test1",
                            "cost": "444",
                            "id": 2
                        }
                    ]
                }
            ]
        }
    ],
    "organizer": [
        {
            "id": 2,
            "label": "Joanna Tamx"
        }
    ],
    "name": "China trip",
    "budget": "1200",
    "friends": [
        {
            "id": 3,
            "label": "Alberto Wesker"
        },
        {
            "id": 4,
            "label": "Jessica Ruan"
        }
    ],
    "startDate": "2024-09-07",
    "endDate": "2024-09-07"
};

export const singleTripDetailobj = null;