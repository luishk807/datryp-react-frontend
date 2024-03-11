export const tripDetailobj = {
    name: "All asian!",
    organizer: "joa",
    budget: 2500,
    total: 5000,
    startDate: '01/01/2023',
    endDate: '01/02/2023',
    note: "",
    people: 2,
    status: 1,
    destinations: [
        {
            date: "01/01/2023",
            trips: null  
        },
        {
            date: "01/02/2023",
            trips: [
                {
                    name: "China",
                    country: "china",
                    note: "",
                    date: "01/01/2023",
                    departAirport: "JFF Aiport",
                    departFlight: "ADD-140",
                    departTime: "10:00am",
                    arrivalAirport: "DFF",
                    arrivalFlight: "AGF-140",
                    arrivalTime: "1:00pm",
                    activities: [
                        {
                            name: "Glass Bridge",
                            status: 1,
                            location: "china, guahnzhow",
                            startTime: "9:00am",
                            image: {
                                url: '/images/sample/china2.jpg',
                                name: 'test',
                            },
                            endTime: "9:30am",
                            people: "2",
                            cost: "150",
                            shareCost: [
                                {
                                    name: "luis",
                                    amount: "100",
                                    status: "not paid"
                                },
                                {
                                    name: "joanana",
                                    amount: "50",
                                    status: "paid"
                                }
                            ]
                        },
                        {
                            name: "Kings Castle",
                            status: 1,
                            location: "china, guahnzhow",
                            startTime: "9:00am",
                            endTime: "9:30am",
                            image: {
                                url: '/images/sample/china1.jpg',
                                name: 'test',
                            },
                            people: "2",
                            cost: "150",
                            shareCost: [
                                {
                                    name: "luis",
                                    amount: "100",
                                    status: "not paid"
                                },
                                {
                                    name: "joanana",
                                    amount: "50",
                                    status: "paid"
                                }
                            ]
                        },
                    ]
                },
                {
                    name: "Vietnam",
                    country: "vietnam",
                    note: "",
                    date: "01/01/2023",
                    departAirport: "JFF Aiport",
                    departFlight: "ADD-140",
                    departTime: "10:00am",
                    arrivalAirport: "DFF",
                    arrivalFlight: "AGF-140",
                    arrivalTime: "1:00pm",
                    activities: [
                        {
                            name: "Yatch vietnam",
                            status: 1,
                            location: "Hoi Nam",
                            startTime: "9:00am",
                            endTime: "9:30am",
                            image: {
                                url: '/images/sample/vietnam.jpg',
                                name: 'test',
                            },
                            people: "2",
                            cost: "250",
                            shareCost: [
                                {
                                    name: "luis",
                                    amount: "100",
                                    status: "not paid"
                                },
                                {
                                    name: "joanana",
                                    amount: "50",
                                    status: "paid"
                                }
                            ]
                        },
                    ]
                },
            ]
        },
    ],

};