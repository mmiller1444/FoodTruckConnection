# Admin day filter

Admin dashboard supports a day query string:

- `/admin?day=YYYY-MM-DD`

The filter uses America/Denver to compute the UTC range [day start, next day start) and filters `public_bookings.start_time` accordingly.
