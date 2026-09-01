alter table public.customers
  add constraint customers_name_length_check check (char_length(name) between 2 and 120),
  add constraint customers_phone_length_check check (char_length(phone) between 6 and 30),
  add constraint customers_address_length_check check (address is null or char_length(address) <= 500),
  add constraint customers_referral_code_length_check check (referral_code is null or char_length(referral_code) <= 50);

alter table public.orders
  add constraint orders_customer_name_length_check check (char_length(customer_name) between 2 and 120),
  add constraint orders_phone_length_check check (char_length(phone) between 6 and 30),
  add constraint orders_address_length_check check (address is null or char_length(address) <= 500),
  add constraint orders_service_type_check check (service_type in ('car','sofa','chair','mattress')),
  add constraint orders_contamination_check check (contamination is null or contamination in ('light','medium','heavy','special')),
  add constraint orders_vehicle_plate_length_check check (vehicle_plate is null or char_length(vehicle_plate) <= 20),
  add constraint orders_vehicle_seats_check check (vehicle_seats is null or vehicle_seats in (5,7,9)),
  add constraint orders_customer_comment_length_check check (customer_comment is null or char_length(customer_comment) <= 2000),
  add constraint orders_distance_check check (distance_km is null or distance_km between 0 and 500),
  add constraint orders_preliminary_price_check check (preliminary_price is null or preliminary_price >= 0),
  add constraint orders_final_price_check check (final_price is null or final_price >= 0),
  add constraint orders_travel_fee_check check (travel_fee >= 0),
  add constraint orders_estimated_minutes_check check (estimated_minutes is null or estimated_minutes between 15 and 1440),
  add constraint orders_actual_minutes_check check (actual_minutes is null or actual_minutes between 0 and 2880);
