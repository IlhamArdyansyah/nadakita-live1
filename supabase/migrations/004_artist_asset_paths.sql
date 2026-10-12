-- Safe if 003_seed.sql was run before local asset paths were added.
-- Only populates currently missing paths. Never overwrites an admin-uploaded image.
update public.artists
set image_path = case slug
  when 'weeknd' then 'assets/images/artists/the-weeknd.jpg'
  when 'bieber' then 'assets/images/artists/justin-bieber.jpg'
  when 'bruno' then 'assets/images/artists/bruno-mars.jpg'
end
where slug in ('weeknd','bieber','bruno')
  and (image_path is null or image_path = '');
